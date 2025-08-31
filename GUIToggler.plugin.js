/**
 * @name GUIToggler
 * @author ㄱㅇㅇ
 * @authorId 1006027073103609887
 * @version 1.0.6
 * @description 🎛️ 채팅 자동 반응/포맷 설정 GUI를 Discord 안에서 직접 조절할 수 있게 해줍니다.
 * @invite rfaznuJj
 * @donate https://buymeacoffee.com/ex0net
 * @patreon https://patreon.com/ex0net
 * @website https://github.com/ex0net/BetterDiscord-GUIToggler
 * @source https://github.com/ex0net/BetterDiscord-GUIToggler
 * @updateUrl https://raw.githubusercontent.com/ex0net/BetterDiscord-GUIToggler/main/GUIToggler.plugin.js
 */

module.exports = class AutoReactFormatter {
    start() {
        setTimeout(() => {
            this.settings = BdApi.loadData("AutoReactFormatter", "settings") || {
                enabled: true,
                mode: "bold",
                autoVote: true,
                autoReact: true,
                reactionEmoji: "✅"
            };

            this.injectGUI();

            // MessageActions 직접 로딩
            const MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
            if (!MessageActions || !MessageActions.sendMessage) {
                console.error("MessageActions.sendMessage를 찾을 수 없습니다.");
                return;
            }

            this.originalSendMessage = MessageActions.sendMessage;

            MessageActions.sendMessage = (channelId, messageObj, ...rest) => {
                console.log("Message to send:", messageObj);

                const result = this.originalSendMessage(channelId, messageObj, ...rest);

                if (this.settings.autoReact && result?.then) {
                    result.then((msg) => {
                        if (!msg?.id || !msg?.channel_id) {
                            console.warn("메시지 ID 또는 채널 ID가 없습니다:", msg);
                            return;
                        }
                        this.addReaction(msg.channel_id, msg.id, this.settings.reactionEmoji);
                    });
                }

                return result;
            };
        }, 3000);
    }

    stop() {
        if (this.observer) this.observer.disconnect();
        const panel = document.getElementById("auto-react-gui");
        if (panel) panel.remove();

        const MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
        if (MessageActions && this.originalSendMessage) {
            MessageActions.sendMessage = this.originalSendMessage;
        }
    }

    addReaction(channelId, messageId, emoji) {
        if (!this.ReactionUtils) {
            this.ReactionUtils = BdApi.findModuleByProps("addReaction", "removeReaction");
        }
        if (!this.ReactionUtils) {
            console.error("ReactionUtils 모듈을 찾을 수 없습니다.");
            return;
        }

        this.ReactionUtils.addReaction(channelId, messageId, emoji)
            .then(() => {
                console.log(`Reaction "${emoji}" added to message ${messageId}`);
            })
            .catch((err) => {
                console.error("Failed to add reaction:", err);
            });
    }

    saveSettings() {
        BdApi.saveData("AutoReactFormatter", "settings", this.settings);
    }

    injectGUI() {
        const gui = document.createElement("div");
        gui.id = "auto-react-gui";
        gui.style.cssText = `
            position:fixed;
            bottom:20px;
            right:20px;
            z-index:9999;
            background:#111;
            color:#fff;
            padding:10px;
            border:1px solid #444;
            border-radius:8px;
            font-family:monospace;
        `;

        const createCheckbox = (label, key) => {
            const wrap = document.createElement("div");
            const box = document.createElement("input");
            box.type = "checkbox";
            box.checked = this.settings[key];
            box.addEventListener("change", () => {
                this.settings[key] = box.checked;
                this.saveSettings();
            });
            wrap.appendChild(box);
            wrap.appendChild(document.createTextNode(" " + label));
            gui.appendChild(wrap);
        };

        createCheckbox("🎭 전체 자동 반응 ON/OFF", "autoReact");
        createCheckbox("📝 자동 포맷", "enabled");

        const select = document.createElement("select");
        ["bold", "italic", "code"].forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            if (m === this.settings.mode) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener("change", () => {
            this.settings.mode = select.value;
            this.saveSettings();
        });
        gui.appendChild(document.createTextNode(" 스타일: "));
        gui.appendChild(select);

        const emojiLabel = document.createElement("label");
        emojiLabel.textContent = "리액션 이모지:";
        emojiLabel.style.display = "block";
        emojiLabel.style.marginTop = "6px";

        const emojiInput = document.createElement("input");
        emojiInput.type = "text";
        emojiInput.value = this.settings.reactionEmoji;
        emojiInput.style.width = "80px";
        emojiInput.addEventListener("input", () => {
            this.settings.reactionEmoji = emojiInput.value;
            this.saveSettings();
        });

        emojiLabel.appendChild(emojiInput);
        gui.appendChild(emojiLabel);

        document.body.appendChild(gui);
    }
};
