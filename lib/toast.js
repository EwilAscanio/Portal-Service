import toast from "react-hot-toast";

const COLORS = {
  success: "#059669",
  error: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
};

const ICONS = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

/**
 * Construye el contenido del toast. Si se pasa `description`, se muestra
 * debajo del mensaje principal como subtítulo.
 */
function renderMessage(msg, opts) {
  if (!opts?.description) return msg;
  return (
    <div>
      <span>{msg}</span>
      <span
        style={{
          display: "block",
          fontSize: "0.8rem",
          fontWeight: 400,
          lineHeight: 1.4,
          marginTop: 3,
          opacity: 0.92,
          whiteSpace: "pre-line",
        }}
      >
        {opts.description}
      </span>
    </div>
  );
}

function baseToast(msg, opts, icon, color) {
  const { description, ...rest } = opts || {};
  return toast(renderMessage(msg, { description }), {
    ...rest,
    icon,
    style: { background: color, color: "#fff", ...opts?.style },
  });
}

export const notify = {
  success: (msg, opts) => baseToast(msg, opts, ICONS.success, COLORS.success),
  error: (msg, opts) => baseToast(msg, opts, ICONS.error, COLORS.error),
  warning: (msg, opts) => baseToast(msg, opts, ICONS.warning, COLORS.warning),
  info: (msg, opts) => baseToast(msg, opts, ICONS.info, COLORS.info),
  loading: (msg, opts) => toast.loading(msg, opts),
  promise: (promise, msgs) => toast.promise(promise, msgs),
  dismiss: (id) => toast.dismiss(id),
};
