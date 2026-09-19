import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

// Config page shown from: right-click widget → Configure Seasonal Tracker
KCM.SimpleKCM {
    // cfg_* aliases are how Plasma binds this form to main.xml
    property alias cfg_backendUrl: urlField.text

    Kirigami.FormLayout {
        QQC2.TextField {
            id: urlField
            Kirigami.FormData.label: i18n("Backend URL")
            placeholderText: "http://127.0.0.1:8765/"
        }

        QQC2.Label {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            text: i18n("The plasmoid only renders the UI. Start the Python backend first:\n  systemctl --user start seasonal-tracker.service")
        }
    }
}
