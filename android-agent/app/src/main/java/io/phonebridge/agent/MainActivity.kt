package io.phonebridge.agent

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
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
    private lateinit var resetButton: Button
    private lateinit var batteryButton: Button
    private lateinit var settingsButton: Button
    private lateinit var statusText: TextView

    private val isRussian: Boolean
        get() = Locale.getDefault().language.equals(
            "ru",
            ignoreCase = true
        )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildUi()
        requestNotificationPermissionIfNeeded()

        if (isPaired()) {
            startHeartbeatService()
        }

        refreshState()
    }

    override fun onResume() {
        super.onResume()
        if (::statusText.isInitialized) refreshState()
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
        root.addView(
            title,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val info = TextView(this).apply {
            text = if (isRussian)
                "Agent держит телефон Online для PhoneBridge. " +
                    "На Xiaomi/Poco нужно разрешить работу без " +
                    "ограничений батареи."
            else
                "The Agent keeps this phone Online for PhoneBridge. " +
                    "Xiaomi/Poco should allow unrestricted battery use."
            textSize = 14f
            setTextColor(Color.rgb(160, 174, 192))
            setPadding(0, dp(18), 0, dp(22))
        }
        root.addView(info)

        pairingInput = EditText(this).apply {
            hint = if (isRussian) "Код привязки" else "Pairing code"
            setHintTextColor(Color.rgb(110, 125, 145))
            setTextColor(Color.WHITE)
            setSingleLine(false)
            minLines = 3
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setBackgroundColor(Color.rgb(17, 27, 45))
        }
        root.addView(
            pairingInput,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        actionButton = Button(this).apply {
            setOnClickListener {
                if (isPaired()) {
                    startHeartbeatService()
                    refreshState()
                } else {
                    pairDevice()
                }
            }
        }
        root.addView(actionButton, fullButtonParams(dp(14)))

        resetButton = Button(this).apply {
            text =
                if (isRussian) "Переподключить телефон"
                else "Reconnect phone"
            setOnClickListener { resetPairing() }
        }
        root.addView(resetButton, fullButtonParams(dp(10)))

        batteryButton = Button(this).apply {
            text =
                if (isRussian)
                    "Разрешить работу без ограничений"
                else
                    "Allow unrestricted battery use"
            setOnClickListener { requestBatteryExemption() }
        }
        root.addView(batteryButton, fullButtonParams(dp(10)))

        settingsButton = Button(this).apply {
            text =
                if (isRussian)
                    "Открыть настройки приложения"
                else
                    "Open app settings"
            setOnClickListener { openAppSettings() }
        }
        root.addView(settingsButton, fullButtonParams(dp(10)))

        statusText = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(183, 173, 255))
            setPadding(0, dp(22), 0, 0)
        }
        root.addView(statusText)

        setContentView(root)
    }

    private fun fullButtonParams(topMargin: Int) =
        LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            this.topMargin = topMargin
        }

    private fun pairDevice() {
        val pairing = pairingInput.text.toString().trim()

        if (pairing.length < 40 || !pairing.contains(".")) {
            statusText.text =
                if (isRussian) "Неверный код привязки"
                else "Invalid pairing code"
            return
        }

        actionButton.isEnabled = false
        statusText.text =
            if (isRussian) "Подключение…"
            else "Connecting…"

        Thread {
            try {
                val result = ApiClient.claim(pairing)

                getSharedPreferences(
                    HeartbeatService.PREFS,
                    MODE_PRIVATE
                )
                    .edit()
                    .putString(
                        HeartbeatService.KEY_AGENT_ID,
                        result.agentId
                    )
                    .putString(
                        HeartbeatService.KEY_DEVICE_TOKEN,
                        result.deviceToken
                    )
                    .remove(HeartbeatService.KEY_LAST_ERROR)
                    .apply()

                runOnUiThread {
                    startHeartbeatService()
                    refreshState()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    actionButton.isEnabled = true
                    statusText.text =
                        if (isRussian)
                            "Ошибка подключения: ${error.message ?: "unknown"}"
                        else
                            "Connection error: ${error.message ?: "unknown"}"
                }
            }
        }.start()
    }

    private fun refreshState() {
        val prefs = getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
        val paired = isPaired()
        val lastOk = prefs.getString(
            HeartbeatService.KEY_LAST_OK,
            null
        )
        val lastError = prefs.getString(
            HeartbeatService.KEY_LAST_ERROR,
            null
        )

        pairingInput.isEnabled = !paired
        resetButton.isEnabled = paired

        if (paired) {
            pairingInput.setText(
                if (isRussian) "Телефон привязан"
                else "Phone is paired"
            )

            actionButton.isEnabled = true
            actionButton.text =
                if (isRussian)
                    "Запустить / проверить соединение"
                else
                    "Start / check connection"

            statusText.text = buildString {
                append(
                    if (isRussian)
                        "Статус: телефон привязан."
                    else
                        "Status: phone paired."
                )

                if (!lastOk.isNullOrBlank()) {
                    append(
                        if (isRussian)
                            "\nПоследний успешный heartbeat: $lastOk"
                        else
                            "\nLast successful heartbeat: $lastOk"
                    )
                }

                if (!lastError.isNullOrBlank()) {
                    append(
                        if (isRussian)
                            "\nПоследняя ошибка: $lastError"
                        else
                            "\nLast error: $lastError"
                    )
                }
            }
        } else {
            pairingInput.setText("")
            actionButton.isEnabled = true
            actionButton.text =
                if (isRussian) "Подключить телефон"
                else "Connect phone"
            statusText.text =
                if (isRussian) "Статус: не подключён"
                else "Status: not connected"
        }

        val powerManager =
            getSystemService(PowerManager::class.java)
        val unrestricted =
            powerManager.isIgnoringBatteryOptimizations(packageName)

        batteryButton.isEnabled = !unrestricted
        batteryButton.text =
            if (unrestricted) {
                if (isRussian)
                    "Батарея: без ограничений ✓"
                else
                    "Battery: unrestricted ✓"
            } else {
                if (isRussian)
                    "Разрешить работу без ограничений"
                else
                    "Allow unrestricted battery use"
            }
    }

    private fun resetPairing() {
        stopService(Intent(this, HeartbeatService::class.java))

        getSharedPreferences(
            HeartbeatService.PREFS,
            MODE_PRIVATE
        )
            .edit()
            .clear()
            .apply()

        refreshState()
    }

    private fun startHeartbeatService() {
        startForegroundService(
            Intent(this, HeartbeatService::class.java)
        )
    }

    private fun requestBatteryExemption() {
        val powerManager =
            getSystemService(PowerManager::class.java)

        if (
            powerManager.isIgnoringBatteryOptimizations(packageName)
        ) {
            refreshState()
            return
        }

        try {
            startActivity(
                Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:$packageName")
                )
            )
        } catch (_: Exception) {
            openAppSettings()
        }
    }

    private fun openAppSettings() {
        startActivity(
            Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:$packageName")
            )
        )
    }

    private fun isPaired(): Boolean {
        val prefs =
            getSharedPreferences(
                HeartbeatService.PREFS,
                MODE_PRIVATE
            )

        return !prefs
            .getString(
                HeartbeatService.KEY_AGENT_ID,
                null
            )
            .isNullOrBlank() &&
            !prefs
                .getString(
                    HeartbeatService.KEY_DEVICE_TOKEN,
                    null
                )
                .isNullOrBlank()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (
            Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(
                arrayOf(
                    Manifest.permission.POST_NOTIFICATIONS
                ),
                100
            )
        }
    }
}
