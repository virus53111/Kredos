package io.phonebridge.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import java.time.Instant
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class HeartbeatService : Service() {
    private var scheduler: ScheduledExecutorService? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(
            NOTIFICATION_ID,
            notification("Connecting to PhoneBridge…"),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val agentId = prefs.getString(KEY_AGENT_ID, null)
        val token = prefs.getString(KEY_DEVICE_TOKEN, null)

        if (agentId.isNullOrBlank() || token.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (scheduler == null) {
            scheduler = Executors.newSingleThreadScheduledExecutor().also { executor ->
                executor.scheduleWithFixedDelay({
                    sendHeartbeat(agentId, token)
                }, 0, 60, TimeUnit.SECONDS)
            }
        }

        return START_STICKY
    }

    private fun sendHeartbeat(agentId: String, token: String) {
        val powerManager = getSystemService(PowerManager::class.java)
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "PhoneBridge:Heartbeat"
        )

        try {
            wakeLock.acquire(20_000)
            ApiClient.heartbeat(agentId, token)

            val now = Instant.now().toString()
            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(KEY_LAST_OK, now)
                .remove(KEY_LAST_ERROR)
                .apply()

            val time = LocalTime.now().format(
                DateTimeFormatter.ofPattern("HH:mm:ss")
            )
            updateNotification("Online · heartbeat $time")
        } catch (error: Exception) {
            val message = error.message ?: "unknown"

            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(KEY_LAST_ERROR, message.take(200))
                .apply()

            if (message.contains("HTTP 401")) {
                getSharedPreferences(PREFS, MODE_PRIVATE)
                    .edit()
                    .remove(KEY_AGENT_ID)
                    .remove(KEY_DEVICE_TOKEN)
                    .apply()

                updateNotification(
                    "Pairing expired · open PhoneBridge Agent"
                )
                stopSelf()
            } else {
                updateNotification("Offline · retrying automatically")
            }
        } finally {
            if (wakeLock.isHeld) wakeLock.release()
        }
    }

    override fun onDestroy() {
        scheduler?.shutdownNow()
        scheduler = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "PhoneBridge connection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description =
                    "Shows when this phone is connected to PhoneBridge"
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
            .setContentTitle("PhoneBridge Agent")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setContentIntent(openApp)
            .build()
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, notification(text))
    }

    companion object {
        const val PREFS = "phonebridge_agent"
        const val KEY_AGENT_ID = "agent_id"
        const val KEY_DEVICE_TOKEN = "device_token"
        const val KEY_LAST_OK = "last_ok"
        const val KEY_LAST_ERROR = "last_error"
        private const val CHANNEL_ID = "phonebridge_connection"
        private const val NOTIFICATION_ID = 4101
    }
}
