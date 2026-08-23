import React, { useState } from "react";
import { getErrorMessage, jsonRequest } from "../../api/client";
import Modal from "../../components/Modal";
import Navbar from "../../components/Navbar";
import "./NotificationPage.css";

const TITLE_LIMIT = 100;
const MESSAGE_LIMIT = 500;

const NotificationPage = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const canSend = title.trim() && message.trim() && !sending;

  const prepareSend = (event) => {
    event.preventDefault();
    if (!canSend) return;
    setFeedback(null);
    setConfirming(true);
  };

  const sendNotification = async () => {
    setSending(true);
    try {
      const result = await jsonRequest(
        "/admin/notifications/broadcast",
        "POST",
        { title: title.trim(), message: message.trim() },
      );
      setConfirming(false);
      setTitle("");
      setMessage("");
      setFeedback({
        type: "success",
        text:
          result.targetedDevices === 0
            ? "No registered Android devices were found."
            : `Delivered to ${result.delivered} of ${result.targetedDevices} registered Android devices${result.failed ? `; ${result.failed} failed` : ""}.`,
      });
    } catch (error) {
      setConfirming(false);
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to send the notification"),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar title="Notifications" />
      <main className="page-shell notification-page">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">Member communication</p>
            <h1 className="page-title">Send a notification</h1>
            <p className="page-subtitle">
              Compose a push notification for every registered Android and iOS device.
            </p>
          </div>
        </header>

        {feedback && (
          <div className={`alert alert--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <span>{feedback.text}</span>
            <button className="alert__dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        <section className="surface-card notification-composer">
          <div className="surface-card__header">
            <div>
              <h2>Android broadcast</h2>
              <p>The notification is sent immediately after confirmation.</p>
            </div>
            <span className="badge badge--active">All mobile users</span>
          </div>

          <form className="notification-form" onSubmit={prepareSend}>
            <div className="field">
              <label htmlFor="notification-title">Title</label>
              <input
                id="notification-title"
                value={title}
                maxLength={TITLE_LIMIT}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Class schedule update"
                required
              />
              <p className="field-hint character-count">{title.length}/{TITLE_LIMIT}</p>
            </div>
            <div className="field">
              <label htmlFor="notification-message">Message</label>
              <textarea
                id="notification-message"
                value={message}
                maxLength={MESSAGE_LIMIT}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write the message members will see…"
                required
              />
              <p className="field-hint character-count">{message.length}/{MESSAGE_LIMIT}</p>
            </div>
            <div className="button-row button-row--end">
              <button type="submit" className="btn btn-primary" disabled={!canSend}>
                Preview & send
              </button>
            </div>
          </form>
        </section>

        <Modal
          isOpen={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={sendNotification}
          title="Send this notification?"
          confirmText="Send now"
          busy={sending}
        >
          <p className="notification-confirm-copy">This will be sent to all registered Android and iOS devices.</p>
          <div className="notification-preview">
            <strong>{title.trim()}</strong>
            <p>{message.trim()}</p>
          </div>
        </Modal>
      </main>
    </>
  );
};

export default NotificationPage;
