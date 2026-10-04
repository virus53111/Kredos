package io.phonebridge.agent

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var pairingInput: EditText
    private lateinit var actionButton: Button
    private lateinit var statusText: TextView

    private val isRussian: Boolean
        get() = Locale.getDefault().language.equals("ru", ignoreCase = true)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildUi()
        requestNotificationPermissionIfNeeded()

        if (isPaired()) {
            showPairedState()
            startHeartbeatService()
        }
    }

    private fun buildUi() {
        val density = resources.displayMetrics.density
        fun dp(value: Int) = (value * density).toInt()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(44), dp(24), dp(24))
            setBackgroundColor(Color.rgb(7, 12, 22))
        }

        val title = TextView(this).apply {
            text = "PhoneBridge Agent"
            textSize = 28f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        root.addView(title, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        val info = TextView(this).apply {
            text = if (isRussian)
                "Приложение только привязывает телефон к PhoneBridge и отправляет heartbeat. Оно не читает SMS, контакты или аккаунты."
            else
                "This app only pairs the phone with PhoneBridge and sends heartbeats. It does not read SMS, contacts, or accounts."
            textSize = 14f
            setTextColor(Color.rgb(160, 174, 192))
            setPadding(0, dp(18), 0, dp(22))
        }
        root.addView(info)

        pairingInput = EditText(this).apply {
            hint = if (isRussian) "Вставь код привязки с сайта" else "Paste pairing code from the website"
            setHintTextColor(Color.rgb(110, 125, 145))
            setTextColor(Color.WHITE)
            setSingleLine(false)
            minLines = 2
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setBackgroundColor(Color.rgb(17, 27, 45))
        }
        root.addView(pairingInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        actionButton = Button(this).apply {
            text = if (isRussian) "Подключить телефон" else "Connect phone"
            setOnClickListener { pairDevice() }
        }
        val buttonParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(14)
        }
        root.addView(actionButton, buttonParams)

        statusText = TextView(this).apply {
            text = if (isRussian) "Статус: не подключён" else "Status: not connected"
            textSize = 14f
            setTextColor(Color.rgb(183, 173, 255))
            setPadding(0, dp(22), 0, 0)
        }
        root.addView(statusText)

        setContentView(root)
    }

    private fun pairDevice() {
        val pairing = pairingInput.text.toString().trim()
        val separator = pairing.lastIndexOf('.')
        if (separator <= 0 || separator >= pairing.length - 1) {
            statusText.text = if (isRussian) "Неверный код привязки" else "Invalid pairing code"
            return
        }

        val pairingId = pairing.substring(0, separator)
        val code = pairing.substring(separator + 1)
        actionButton.isEnabled = false
        statusText.text = if (isRussian) "Подключение…" else "Connecting…"

        Thread {
            try {
                val result = ApiClient.claim(pairingId, code)
                getSharedPreferences(HeartbeatService.PREFS, MODE_PRIVATE)
                    .edit()
                    .putString(HeartbeatService.KEY_AGENT_ID, result.agentId)
                    .putString(HeartbeatService.KEY_DEVICE_TOKEN, result.deviceToken)
                    .apply()

                runOnUiThread {
                    showPairedState()
                    startHeartbeatService()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    actionButton.isEnabled = true
                    statusText.text = if (isRussian)
                        "Ошибка подключения: ${error.message ?: "unknown"}"
                    else
                        "Connection error: ${error.message ?: "unknown"}"
                }
            }
        }.start()
    }

    private fun isPaired(): Boolean {
        val prefs = getSharedPreferences(HeartbeatService.PREFS, MODE_PRIVATE)
        return !prefs.getString(HeartbeatService.KEY_AGENT_ID, null).isNullOrBlank() &&
            !prefs.getString(HeartbeatService.KEY_DEVICE_TOKEN, null).isNullOrBlank()
    }

    private fun showPairedState() {
        pairingInput.isEnabled = false
        pairingInput.setText(if (isRussian) "Телефон уже привязан" else "Phone is paired")
        actionButton.isEnabled = false
        actionButton.text = if (isRussian) "Подключено" else "Connected"
        statusText.text = if (isRussian)
            "Статус: heartbeat запущен. В шторке Android будет постоянное уведомление."
        else
            "Status: heartbeat is running. Android shows a persistent notification."
    }

    private fun startHeartbeatService() {
        startForegroundService(Intent(this, HeartbeatService::class.java))
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
        }
    }
}
