package io.phonebridge.agent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.ComponentName
import android.content.Context
import android.graphics.Path
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
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
                "text" -> setText(command.optString("text", ""))
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

    private fun setText(value: String) {
        if (value.isEmpty()) return

        val root = rootInActiveWindow ?: return
        val focused = root.findFocus(
            AccessibilityNodeInfo.FOCUS_INPUT
        ) ?: return

        if (!focused.isEditable) return

        val args = Bundle().apply {
            putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                value.take(500)
            )
        }

        focused.performAction(
            AccessibilityNodeInfo.ACTION_SET_TEXT,
            args
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

        fun isEnabled(context: Context): Boolean {
            val expected = ComponentName(
                context,
                RemoteControlService::class.java
            ).flattenToString()

            val enabled = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            return enabled
                .split(':')
                .any { it.equals(expected, ignoreCase = true) }
        }
    }
}
