import { useState } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import {
  serverUrl,
  currentChannel,
  currentThread,
  threadsByServer,
  currentUserByServer,
  users,
  hasCapability,
} from "../../state";
import { avatarUrl } from "../../utils";
import {
  selectThread,
  createThread,
  deleteThread,
  joinThread,
  leaveThread,
} from "../../lib/actions";
import { Header } from "../Header";
import { showThreadPanel, renderChannelsSignal } from "../../lib/ui-signals";
import { Icon } from "../Icon";
import { wsSend } from "../../lib/websocket";
import { ThreadContextMenu, useThreadContextMenu } from "../ThreadContextMenu";
import type { Thread } from "../../types";
import styles from "./ThreadPanel.module.css";

export function ThreadPanel() {
  const [newThreadName, setNewThreadName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { showThreadMenu, closeThreadMenu, threadMenu } =
    useThreadContextMenu();

  const ch = currentChannel.value;
  const isForum = ch?.type === "forum";
  const threads = isForum
    ? threadsByServer.value[serverUrl.value]?.[ch.name] || []
    : [];

  const supportsJoinLeave =
    hasCapability("thread_join") && hasCapability("thread_leave");

  useSignalEffect(() => {
    renderChannelsSignal.value;
    currentChannel.value;
    if (currentChannel.value?.type === "forum") {
      showThreadPanel.value = true;
    }
  });

  if (!isForum) {
    return null;
  }

  const handleCreateThread = (e: Event) => {
    e.preventDefault();
    if (!newThreadName.trim() || !ch) return;
    createThread(ch.name, newThreadName.trim());
    setNewThreadName("");
    setIsCreating(false);
  };

  const handleThreadClick = (thread: Thread) => {
    selectThread(thread);
    wsSend({ cmd: "thread_messages", thread_id: thread.id }, serverUrl.value);
  };

  const handleDeleteThread = (e: Event, threadId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this thread?")) {
      deleteThread(threadId);
    }
  };

  const handleJoinThread = (e: Event, threadId: string) => {
    e.stopPropagation();
    joinThread(threadId);
  };

  const handleLeaveThread = (e: Event, threadId: string) => {
    e.stopPropagation();
    leaveThread(threadId);
  };

  const myUsername = currentUserByServer.value[serverUrl.value]?.username;

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className={styles.mainContentWrapper}>
      <Header />
      <div className={styles.threadPanel}>
        <div className={styles.threadList}>
          {threads.length === 0 ? (
            <div className={styles.threadEmpty}>
              <Icon name="MessageSquare" size={32} />
              <p>No threads yet</p>
              <p className={styles.threadEmptyHint}>Create the first thread!</p>
            </div>
          ) : (
            <div className={styles.threadGrid}>
              {threads.map((thread) => {
                const isParticipant = thread.participants?.includes(
                  myUsername || "",
                );
                const participantCount = thread.participants?.length || 0;

                return (
                  <div
                    key={thread.id}
                    className={`${styles.threadCard} ${currentThread.value?.id === thread.id ? styles.active : ""}`}
                    onClick={() => handleThreadClick(thread)}
                    onContextMenu={(e) => showThreadMenu(e, thread)}
                  >
                    <div className={styles.threadCardHeader}>
                      <img
                        className={styles.threadCardAvatar}
                        src={avatarUrl(thread.created_by)}
                        alt={thread.created_by}
                      />
                      <div className={styles.threadCardInfo}>
                        <span className={styles.threadCardUsername}>
                          {thread.created_by}
                        </span>
                        <span className={styles.threadCardTime}>
                          {formatTimestamp(thread.created_at)}
                        </span>
                      </div>
                      {thread.locked && (
                        <span className={styles.threadCardLocked}>
                          <Icon name="Lock" size={12} />
                        </span>
                      )}
                    </div>
                    <div className={styles.threadCardTitle}>{thread.name}</div>
                    <div className={styles.threadCardFooter}>
                      <div className={styles.threadCardMeta}>
                        {supportsJoinLeave && participantCount > 0 && (
                          <span
                            className={styles.threadCardParticipants}
                            title={`${participantCount} participant${participantCount === 1 ? "" : "s"}`}
                          >
                            <Icon name="Users" size={12} />
                            {participantCount}
                          </span>
                        )}
                        <span className={styles.threadCardReplies}>
                          <Icon name="MessageSquare" size={12} />0
                        </span>
                      </div>
                      <div className={styles.threadCardActions}>
                        {supportsJoinLeave &&
                          !thread.locked &&
                          (isParticipant ? (
                            <button
                              className={styles.threadCardLeave}
                              onClick={(e) => handleLeaveThread(e, thread.id)}
                              title="Leave thread"
                            >
                              <Icon name="UserMinus" size={14} />
                            </button>
                          ) : (
                            <button
                              className={styles.threadCardJoin}
                              onClick={(e) => handleJoinThread(e, thread.id)}
                              title="Join thread"
                            >
                              <Icon name="UserPlus" size={14} />
                            </button>
                          ))}
                        {(thread.created_by === myUsername ||
                          myUsername === "admin") && (
                          <button
                            className={styles.threadCardDelete}
                            onClick={(e) => handleDeleteThread(e, thread.id)}
                            title="Delete thread"
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.threadCreate}>
          {isCreating ? (
            <form
              onSubmit={handleCreateThread}
              className={styles.threadCreateForm}
            >
              <input
                type="text"
                placeholder="Thread name..."
                value={newThreadName}
                onInput={(e) =>
                  setNewThreadName((e.target as HTMLInputElement).value)
                }
                autoFocus
                maxLength={100}
              />
              <div className={styles.threadCreateActions}>
                <button type="button" onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={!newThreadName.trim()}>
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              className={styles.threadCreateBtn}
              onClick={() => setIsCreating(true)}
            >
              <Icon name="Plus" size={16} />
              <span>New Thread</span>
            </button>
          )}
        </div>
      </div>
      {threadMenu && (
        <ThreadContextMenu
          thread={threadMenu.thread}
          x={threadMenu.x}
          y={threadMenu.y}
          onClose={closeThreadMenu}
        />
      )}
    </div>
  );
}

export function ThreadView() {
  const thread = currentThread.value;
  const supportsJoinLeave =
    hasCapability("thread_join") && hasCapability("thread_leave");
  const myUsername = currentUserByServer.value[serverUrl.value]?.username;
  const isParticipant = thread?.participants?.includes(myUsername || "");

  useSignalEffect(() => {
    currentThread.value;
  });

  if (!thread) {
    return null;
  }

  return (
    <div className={styles.threadView}>
      <div className={styles.threadViewHeader}>
        <button
          className={styles.threadViewBack}
          onClick={() => selectThread(null)}
        >
          <Icon name="ArrowLeft" size={18} />
        </button>
        <div className={styles.threadViewTitle}>
          <Icon name="MessageSquare" size={18} />
          <span>{thread.name}</span>
        </div>
        {supportsJoinLeave && (
          <div className={styles.threadViewActions}>
            {thread.participants && thread.participants.length > 0 && (
              <div className={styles.threadViewParticipants}>
                <Icon name="Users" size={14} />
                <span>{thread.participants.length}</span>
              </div>
            )}
            {!thread.locked &&
              (isParticipant ? (
                <button
                  className={styles.threadViewLeave}
                  onClick={() => leaveThread(thread.id)}
                  title="Leave thread"
                >
                  <Icon name="UserMinus" size={16} />
                  <span>Leave</span>
                </button>
              ) : (
                <button
                  className={styles.threadViewJoin}
                  onClick={() => joinThread(thread.id)}
                  title="Join thread"
                >
                  <Icon name="UserPlus" size={16} />
                  <span>Join</span>
                </button>
              ))}
          </div>
        )}
      </div>
      <div className={styles.threadViewContent}>
        Thread messages will appear here...
      </div>
    </div>
  );
}
