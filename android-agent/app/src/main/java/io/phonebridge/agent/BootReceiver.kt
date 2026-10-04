package io.phonebridge.agent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val prefs = context.getSharedPreferences(
            HeartbeatService.PREFS,
            Context.MODE_PRIVATE
        )

        val agentId = prefs.getString(
            HeartbeatService.KEY_AGENT_ID,
            null
        )
        val token = prefs.getString(
            HeartbeatService.KEY_DEVICE_TOKEN,
            null
        )

        if (
            !agentId.isNullOrBlank() &&
            !token.isNullOrBlank()
        ) {
            context.startForegroundService(
                Intent(
                    context,
                    HeartbeatService::class.java
                )
            )
        }
    }
}
