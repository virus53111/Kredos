package io.phonebridge.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
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
                    try {
                        ApiClient.heartbeat(agentId, token)
                        val time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
                        updateNotification("Online · heartbeat $time")
                    } catch (_: Exception) {
                        updateNotification("Connection error · retrying")
                    }
                }, 0, 60, TimeUnit.SECONDS)
            }
        }
        return START_STICKY
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
                description = "Shows when this phone is connected to PhoneBridge"
            }
        )
    }

    private fun notification(text: String): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
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
        private const val CHANNEL_ID = "phonebridge_connection"
        private const val NOTIFICATION_ID = 4101
    }
}
