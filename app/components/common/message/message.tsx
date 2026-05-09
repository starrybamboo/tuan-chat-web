import "./messageAnimations.css";

enum MessageType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

const MESSAGE_HOST_ID = "tc-floating-message-host";

const messageItem = {
  [MessageType.INFO]: {
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `,
    className: "alert-info",
  },
  [MessageType.WARNING]: {
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    `,
    className: "alert-warning",
  },
  [MessageType.ERROR]: {
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `,
    className: "alert-error",
  },
  [MessageType.SUCCESS]: {
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `,
    className: "alert-success",
  },
} as const;

function ensureMessageHost() {
  let host = document.getElementById(MESSAGE_HOST_ID);
  if (host) {
    return host;
  }

  host = document.createElement("div");
  host.id = MESSAGE_HOST_ID;
  host.className = "pointer-events-none fixed left-1/2 top-6 z-50 flex -translate-x-1/2 flex-col gap-2";
  document.body.appendChild(host);
  return host;
}

function createMessage(type: MessageType, message: string, className?: string) {
  if (typeof document === "undefined") {
    return;
  }

  const host = ensureMessageHost();
  const item = document.createElement("div");
  item.className = `pointer-events-auto alert ${messageItem[type].className} ${className ?? ""} fade-in-out transition-all duration-300`;

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = messageItem[type].icon.trim();

  const text = document.createElement("span");
  text.textContent = message;

  item.append(icon, text);
  host.appendChild(item);

  window.setTimeout(() => {
    item.classList.add("fade-out");
  }, 2500);

  window.setTimeout(() => {
    item.remove();
    if (!host.hasChildNodes()) {
      host.remove();
    }
  }, 3000);
}

const messageApi = {
  success: (message: string) => createMessage(MessageType.SUCCESS, message),
  error: (message: string) => createMessage(MessageType.ERROR, message),
  warning: (message: string) => createMessage(MessageType.WARNING, message),
  info: (message: string) => createMessage(MessageType.INFO, message),
};

export default messageApi;
