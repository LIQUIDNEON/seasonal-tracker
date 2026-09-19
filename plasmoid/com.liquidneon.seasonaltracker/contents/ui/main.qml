import QtQuick
import QtQuick.Layouts
import QtWebEngine
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasmoid

/*
 * Plasma 6 desktop face for Seasonal Tracker.
 *
 * This applet does not fetch AniList itself. It embeds the local web UI
 * served by widget.py on 127.0.0.1. That split keeps scheduling / library
 * logic in Python and lets the same UI run as a window on GNOME.
 */
PlasmoidItem {
    id: root

    // Prefer the full schedule on the desktop. On a panel the compact
    // icon opens this same view as a popup.
    preferredRepresentation: fullRepresentation
    switchWidth: Kirigami.Units.gridUnit * 14
    switchHeight: Kirigami.Units.gridUnit * 12

    fullRepresentation: Item {
        id: face

        Layout.minimumWidth: Kirigami.Units.gridUnit * 18
        Layout.minimumHeight: Kirigami.Units.gridUnit * 14
        Layout.preferredWidth: 1080
        Layout.preferredHeight: 700

        readonly property string backendUrl: {
            const configured = plasmoid.configuration.backendUrl
            return (configured && configured.length) ? configured : "http://127.0.0.1:8765/"
        }

        WebEngineView {
            id: view
            anchors.fill: parent
            url: face.backendUrl
            backgroundColor: "#0e1116"

            // Local tracker only. Block navigations that would escape the widget.
            onNavigationRequested: function(request) {
                const target = request.url.toString()
                if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) {
                    request.action = WebEngineNavigationRequest.AcceptRequest
                } else {
                    request.action = WebEngineNavigationRequest.IgnoreRequest
                    Qt.openUrlExternally(request.url)
                }
            }

            onLoadingChanged: function(request) {
                if (request.status === WebEngineView.LoadFailedStatus)
                    fail.visible = true
                else if (request.status === WebEngineView.LoadSucceededStatus)
                    fail.visible = false
            }
        }

        Rectangle {
            id: fail
            visible: false
            anchors.fill: parent
            color: "#0e1116"

            Column {
                anchors.centerIn: parent
                spacing: Kirigami.Units.smallSpacing
                width: parent.width - Kirigami.Units.gridUnit * 2

                Text {
                    width: parent.width
                    horizontalAlignment: Text.AlignHCenter
                    color: "#e8eef6"
                    font.pixelSize: 16
                    text: i18n("Tracker backend is not running")
                }
                Text {
                    width: parent.width
                    wrapMode: Text.WordWrap
                    horizontalAlignment: Text.AlignHCenter
                    color: "#8b98a8"
                    font.pixelSize: 12
                    text: i18n("From a terminal:\nsystemctl --user start seasonal-tracker.service\nthen click Retry.")
                }
                PlasmaComponents.Button {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: i18n("Retry")
                    onClicked: view.reload()
                }
            }
        }
    }

    compactRepresentation: Item {
        Kirigami.Icon {
            anchors.fill: parent
            source: "video-x-generic"
        }
        MouseArea {
            anchors.fill: parent
            onClicked: root.expanded = !root.expanded
        }
    }
}
