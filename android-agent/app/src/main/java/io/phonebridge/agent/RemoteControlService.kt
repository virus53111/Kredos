package io.phonebridge.agent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

class RemoteControlService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // PhoneBridge does not read accessibility event content.
    }

    override fun onInterrupt() {}

    fun runRemoteCommand(raw: String) {
        val command = JSONObject(raw)
        when (command.optString("type")) {
            "tap" -> {
                val x = command.optDouble("x", -1.0)
                val y = command.optDouble("y", -1.0)
                if (x !in 0.0..1.0 || y !in 0.0..1.0) return

                val metrics = resources.displayMetrics
                val path = Path().apply {
                    moveTo(
                        (x * metrics.widthPixels).toFloat(),
                        (y * metrics.heightPixels).toFloat()
                    )
                }

                dispatchGesture(
                    GestureDescription.Builder()
                        .addStroke(
                            GestureDescription.StrokeDescription(
                                path,
                                0,
                                70
                            )
                        )
                        .build(),
                    null,
                    null
                )
            }
        }
    }
}