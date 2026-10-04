package io.phonebridge.agent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

class RemoteControlService : AccessibilityService() {
    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // PhoneBridge does not read accessibility event content.
    }

    override fun onInterrupt() {}

    private fun execute(raw: String) {
        try {
            val command = JSONObject(raw)
            when (command.optString("type")) {
                "tap" -> tap(
                    command.optDouble("x", -1.0),
                    command.optDouble("y", -1.0)
                )
                "swipe" -> swipe(
                    command.optDouble("x1", -1.0),
                    command.optDouble("y1", -1.0),
                    command.optDouble("x2", -1.0),
                    command.optDouble("y2", -1.0),
                    command.optLong("duration", 300L)
                )
                "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
                "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            }
        } catch (_: Exception) {
            // Ignore malformed remote commands.
        }
    }

    private fun tap(x: Double, y: Double) {
        if (!valid(x) || !valid(y)) return

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

    private fun swipe(
        x1: Double,
        y1: Double,
        x2: Double,
        y2: Double,
        duration: Long
    ) {
        if (
            !valid(x1) ||
            !valid(y1) ||
            !valid(x2) ||
            !valid(y2)
        ) return

        val metrics = resources.displayMetrics
        val path = Path().apply {
            moveTo(
                (x1 * metrics.widthPixels).toFloat(),
                (y1 * metrics.heightPixels).toFloat()
            )
            lineTo(
                (x2 * metrics.widthPixels).toFloat(),
                (y2 * metrics.heightPixels).toFloat()
            )
        }

        dispatchGesture(
            GestureDescription.Builder()
                .addStroke(
                    GestureDescription.StrokeDescription(
                        path,
                        0,
                        duration.coerceIn(100L, 1200L)
                    )
                )
                .build(),
            null,
            null
        )
    }

    private fun valid(value: Double): Boolean =
        value in 0.0..1.0

    companion object {
        @Volatile
        private var instance: RemoteControlService? = null

        fun handleCommand(raw: String) {
            instance?.execute(raw)
        }
    }
}
