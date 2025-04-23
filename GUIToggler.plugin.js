// BetterDiscord 플러그인 구조로 포팅된 자동 리액션 및 포맷 플러그인

/**
 * @name GUIToggler
 * @author ㄱㅇㅇ
 * @authorId 1006027073103609887
 * @version 1.0.0
 * @description 🎛️ 채팅 자동 반응/포맷 설정 GUI를 Discord 안에서 직접 조절할 수 있게 해줍니다.
 * @invite rfaznuJj
 * @donate https://buymeacoffee.com/ex0net
 * @patreon https://patreon.com/ex0net
 * @website https://ex0.dev/
 * @source https://github.com/ex0net/BetterDiscord-GUIToggler
 * @updateUrl https://raw.githubusercontent.com/ex0net/BetterDiscord-GUIToggler/main/GUIToggler.plugin.js
 */

module.exports = class AutoReactFormatter {
    start() {
      this.settings = BdApi.loadData("AutoReactFormatter", "settings") || {
        enabled: true,
        mode: "bold",
        autoVote: true,
        autoReact: true,
        reactionEmoji: "✅"
      };
  
      this.injectGUI();
      this.observeMessages();
    }
  
    stop() {
      if (this.observer) this.observer.disconnect();
      const panel = document.getElementById("auto-react-gui");
      if (panel) panel.remove();
    }
  
    saveSettings() {
      BdApi.saveData("AutoReactFormatter", "settings", this.settings);
    }
  
    injectGUI() {
      const gui = document.createElement("div");
      gui.id = "auto-react-gui";
      gui.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;background:#111;color:#fff;padding:10px;border:1px solid #444;border-radius:8px;font-family:monospace";
  
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
  
    observeMessages() {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((n) => {
            if (!n.querySelector) return;
  
            const msg = n.querySelector("[data-list-item-id^='chat-messages']");
            if (!msg) return;
  
            const username = msg.querySelector("h3 span span")?.textContent || "";
            const isMine = username.includes("(You)");
  
            if (isMine && this.settings.autoReact) {
              const content = msg.querySelector(".markup-2BOw-j")?.textContent || "";
              const isVote = content.toLowerCase().includes("vote:") || content.includes("투표:");
  
              const emojis = isVote ? ["👍", "👎"] : [this.settings.reactionEmoji];
  
              emojis.forEach((emoji) => {
                const reactBtn = msg.querySelector("[aria-label='Add Reaction']");
                if (reactBtn) {
                  reactBtn.click();
                  setTimeout(() => {
                    const picker = document.querySelector("[role='dialog']");
                    const emojiBtn = Array.from(picker?.querySelectorAll("div[role='gridcell']") || []).find((btn) =>
                      btn.innerText.includes(emoji)
                    );
                    emojiBtn?.click();
                  }, 300);
                }
              });
            }
          });
        });
      });
  
      const chat = document.querySelector('[class*="scrollerInner"]');
      if (chat) this.observer.observe(chat, { childList: true, subtree: true });
    }
  };
  