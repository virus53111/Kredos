package io.phonebridge.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.DisplayMetrics
import java.io.ByteArrayOutputStream
import java.net.URLEncoder
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString

class ScreenShareService : Service() {
    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private var projection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var frameThread: HandlerThread? = null
    private var frameHandler: Handler? = null
    private var scheduler: ScheduledExecutorService? = null
    private var webSocket: WebSocket? = null

    @Volatile
    private var activeSessionId: String? = null

    @Volatile
    private var socketOpen = false

    @Volatile
    private var lastFrameAt = 0L

    override fun onCreate() {
        super.onCreate()

        getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
            .edit()
            .putBoolean(KEY_SCREEN_READY, false)
            .apply()

        createChannel()
        startForeground(
            NOTIFICATION_ID,
            notification("Screen sharing starting…"),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        )
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        val resultCode = intent?.getIntExtra(
            EXTRA_RESULT_CODE,
            Int.MIN_VALUE
        ) ?: Int.MIN_VALUE

        val resultData = if (Build.VERSION.SDK_INT >= 33) {
            intent?.getParcelableExtra(
                EXTRA_RESULT_DATA,
                Intent::class.java
            )
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra(EXTRA_RESULT_DATA)
        }

        if (
            projection == null &&
            resultCode != Int.MIN_VALUE &&
            resultData != null
        ) {
            startProjection(resultCode, resultData)
        }

        startSessionPolling()
        return START_STICKY
    }

    private fun startProjection(
        resultCode: Int,
        resultData: Intent
    ) {
        val manager = getSystemService(
            MediaProjectionManager::class.java
        )

        val mediaProjection = manager.getMediaProjection(
            resultCode,
            resultData
        )

        if (Build.VERSION.SDK_INT >= 34) {
            mediaProjection.registerCallback(
                object : MediaProjection.Callback() {
                    override fun onStop() {
                        stopProjection()
                    }
                },
                Handler(mainLooper)
            )
        }

        projection = mediaProjection

        val metrics = resources.displayMetrics
        val sourceWidth = metrics.widthPixels
        val sourceHeight = metrics.heightPixels
        val targetWidth = minOf(540, sourceWidth)
        val targetHeight = maxOf(
            1,
            (sourceHeight.toLong() * targetWidth / sourceWidth)
                .toInt()
        )

        imageReader = ImageReader.newInstance(
            targetWidth,
            targetHeight,
            PixelFormat.RGBA_8888,
            2
        )

        frameThread = HandlerThread(
            "PhoneBridgeScreenFrames"
        ).also { it.start() }

        frameHandler = Handler(frameThread!!.looper)

        imageReader?.setOnImageAvailableListener(
            { reader ->
                val image = reader.acquireLatestImage()
                    ?: return@setOnImageAvailableListener

                try {
                    maybeSendFrame(image)
                } finally {
                    image.close()
                }
            },
            frameHandler
        )

        virtualDisplay = mediaProjection.createVirtualDisplay(
            "PhoneBridgeScreen",
            targetWidth,
            targetHeight,
            metrics.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface,
            null,
            frameHandler
        )

        getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
            .edit()
            .putBoolean(KEY_SCREEN_READY, true)
            .apply()

        updateNotification(
            "Screen ready · waiting for rental"
        )
    }

    private fun maybeSendFrame(image: Image) {
        if (!socketOpen || activeSessionId == null) return

        val now = System.currentTimeMillis()
        if (now - lastFrameAt < 250) return
        lastFrameAt = now

        val plane = image.planes.firstOrNull() ?: return
        val buffer = plane.buffer
        val pixelStride = plane.pixelStride
        val rowStride = plane.rowStride
        val rowPadding =
            rowStride - pixelStride * image.width
        val paddedWidth =
            image.width + rowPadding / pixelStride

        val padded = Bitmap.createBitmap(
            paddedWidth,
            image.height,
            Bitmap.Config.ARGB_8888
        )

        buffer.rewind()
        padded.copyPixelsFromBuffer(buffer)

        val cropped = Bitmap.createBitmap(
            padded,
            0,
            0,
            image.width,
            image.height
        )

        val jpeg = ByteArrayOutputStream().use { output ->
            cropped.compress(
                Bitmap.CompressFormat.JPEG,
                55,
                output
            )
            output.toByteArray()
        }

        if (cropped !== padded) cropped.recycle()
        padded.recycle()

        webSocket?.send(jpeg.toByteString())
    }

    private fun startSessionPolling() {
        if (scheduler != null) return

        val prefs = getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
        val agentId = prefs.getString(
            HeartbeatService.KEY_AGENT_ID,
            null
        )
        val token = prefs.getString(
            HeartbeatService.KEY_DEVICE_TOKEN,
            null
        )

        if (agentId.isNullOrBlank() || token.isNullOrBlank()) {
            stopSelf()
            return
        }

        scheduler = Executors
            .newSingleThreadScheduledExecutor()
            .also { executor ->
                executor.scheduleWithFixedDelay(
                    {
                        try {
                            val session =
                                ApiClient.agentSession(
                                    agentId,
                                    token
                                )

                            val nextId =
                                if (session.active)
                                    session.sessionId
                                else
                                    null

                            if (nextId != activeSessionId) {
                                closeSocket()
                                activeSessionId = nextId

                                if (nextId != null) {
                                    openSocket(
                                        nextId,
                                        token
                                    )
                                } else {
                                    updateNotification(
                                        "Screen ready · waiting for rental"
                                    )
                                }
                            } else if (
                                nextId != null &&
                                !socketOpen
                            ) {
                                openSocket(nextId, token)
                            }
                        } catch (_: Exception) {
                            // Keep permission alive and retry automatically.
                        }
                    },
                    0,
                    3,
                    TimeUnit.SECONDS
                )
            }
    }

    private fun openSocket(
        sessionId: String,
        deviceToken: String
    ) {
        val wsBase = BuildConfig.API_BASE_URL
            .replace("https://", "wss://")
            .replace("http://", "ws://")

        val token = URLEncoder.encode(
            deviceToken,
            Charsets.UTF_8.name()
        )
        val session = URLEncoder.encode(
            sessionId,
            Charsets.UTF_8.name()
        )

        val request = Request.Builder()
            .url(
                "$wsBase/ws?role=agent" +
                    "&sessionId=$session" +
                    "&token=$token"
            )
            .build()

        webSocket = client.newWebSocket(
            request,
            object : WebSocketListener() {
                override fun onOpen(
                    webSocket: WebSocket,
                    response: Response
                ) {
                    socketOpen = true
                    updateNotification(
                        "Streaming · rental active"
                    )
                }

                override fun onFailure(
                    webSocket: WebSocket,
                    t: Throwable,
                    response: Response?
                ) {
                    socketOpen = false
                }

                override fun onClosed(
                    webSocket: WebSocket,
                    code: Int,
                    reason: String
                ) {
                    socketOpen = false
                }
            }
        )
    }

    private fun closeSocket() {
        socketOpen = false
        webSocket?.close(1000, "session_changed")
        webSocket = null
    }

    private fun stopProjection() {
        closeSocket()
        activeSessionId = null

        val currentProjection = projection
        projection = null

        imageReader?.setOnImageAvailableListener(
            null,
            null
        )
        virtualDisplay?.release()
        virtualDisplay = null

        imageReader?.close()
        imageReader = null

        try {
            currentProjection?.stop()
        } catch (_: Exception) {
            // Projection may already be stopped by Android.
        }

        frameThread?.quitSafely()
        frameThread = null
        frameHandler = null

        getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
            .edit()
            .putBoolean(KEY_SCREEN_READY, false)
            .apply()

        updateNotification(
            "Screen permission stopped · open Agent"
        )
    }

    override fun onDestroy() {
        scheduler?.shutdownNow()
        scheduler = null

        stopProjection()

        client.dispatcher.executorService.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "PhoneBridge screen sharing",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description =
                        "Visible while screen sharing permission is active"
                }
            )
    }

    private fun notification(text: String): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or
                PendingIntent.FLAG_IMMUTABLE
        )

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("PhoneBridge Screen")
            .setContentText(text)
            .setSmallIcon(
                android.R.drawable.presence_video_online
            )
            .setOngoing(true)
            .setContentIntent(openApp)
            .build()
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(
                NOTIFICATION_ID,
                notification(text)
            )
    }

    companion object {
        const val EXTRA_RESULT_CODE =
            "screen_result_code"
        const val EXTRA_RESULT_DATA =
            "screen_result_data"
        const val KEY_SCREEN_READY =
            "screen_ready"

        private const val CHANNEL_ID =
            "phonebridge_screen"
        private const val NOTIFICATION_ID =
            4102
    }
}
