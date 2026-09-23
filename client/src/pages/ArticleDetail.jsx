import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api";

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creatingRevision, setCreatingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState("");

  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentSuccess, setCommentSuccess] = useState("");

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/articles/${id}`);
        setArticle(response.data.article);
      } catch (err) {
        console.error("Fetch article error:", err);

        setError(
          err.response?.data?.message || "Failed to load article."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const response = await api.get(`/articles/${id}/history`);
        setHistory(response.data.history || []);
      } catch (err) {
        console.error("Fetch history error:", err);

        setHistoryError(
          err.response?.data?.message ||
            "Failed to load article history."
        );
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  const handleCreateRevision = async () => {
    try {
      setCreatingRevision(true);
      setRevisionError("");

      const response = await api.post(
        `/articles/${article._id}/revision`
      );

      const revision = response.data.revision;

      navigate(`/articles/revisions/${revision._id}/edit`);
    } catch (err) {
      console.error("Create revision error:", err);

      setRevisionError(
        err.response?.data?.message ||
          "Failed to create revision."
      );
    } finally {
      setCreatingRevision(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    try {
      setCommentLoading(true);
      setCommentError("");
      setCommentSuccess("");

      await api.post(`/articles/${article._id}/comments`, {
        comment: comment.trim(),
      });

      setComment("");
      setCommentSuccess("Comment added successfully.");

      const response = await api.get(
        `/articles/${article._id}/history`
      );

      setHistory(response.data.history || []);
    } catch (err) {
      console.error("Add comment error:", err);

      setCommentError(
        err.response?.data?.message ||
          "Failed to add comment."
      );
    } finally {
      setCommentLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "DRAFT":
        return "border-hairline bg-paper text-muted";

      case "SUBMITTED":
        return "border-amber-200 bg-amber-50 text-amber-800";

      case "CHANGES_REQUESTED":
        return "border-orange-200 bg-orange-50 text-orange-800";

      case "APPROVED":
        return "border-green-200 bg-green-50 text-green-800";

      case "PUBLISHED":
        return "border-blue-200 bg-blue-50 text-blue-800";

      default:
        return "border-hairline bg-paper text-muted";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper font-sans text-ink antialiased">
        <div className="h-[3px] bg-press" />

        <div className="flex min-h-[calc(100vh-3px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-press" />

            <p className="text-sm text-muted">
              Loading article...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper font-sans text-ink antialiased">
        <div className="h-[3px] bg-press" />

        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>

          <button
            onClick={() => navigate(-1)}
            className="mt-5 border border-hairline bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:border-press hover:bg-press hover:text-white"
          >
            Go Back
          </button>
        </main>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <div className="h-[3px] bg-press" />

      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-press">
              Editorial Workflow
            </p>

            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
              Article
            </h1>

            <p className="mt-1 text-sm text-muted">
              Article details, history and editorial activity
            </p>
          </div>

          <span
            className={`inline-flex border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusClass(
              article.status
            )}`}
          >
            {article.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <article className="border border-hairline bg-white">
          <div className="border-b border-hairline px-7 py-7 sm:px-10 sm:py-9">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-press">
              {article.section?.name || "Unknown Section"}
            </div>

            <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              {article.title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 border-t border-hairline pt-5 text-xs text-muted">
              <span>
                Author:{" "}
                <strong className="font-medium text-ink">
                  {article.author?.name ||
                    article.author?.email ||
                    "Unknown"}
                </strong>
              </span>

              {article.createdAt && (
                <span>
                  Created:{" "}
                  {new Date(
                    article.createdAt
                  ).toLocaleDateString()}
                </span>
              )}

              {article.submittedAt && (
                <span>
                  Submitted:{" "}
                  {new Date(
                    article.submittedAt
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="px-7 py-7 sm:px-10 sm:py-9">
            {article.summary && (
              <div className="border-l-[3px] border-press bg-paper px-5 py-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-press">
                  Summary
                </p>

                <p className="text-sm leading-7 text-muted">
                  {article.summary}
                </p>
              </div>
            )}

            <div className="mt-9">
              <div className="mb-5 flex items-center gap-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Article Content
                </h2>

                <div className="h-px flex-1 bg-hairline" />
              </div>

              <div className="whitespace-pre-wrap font-serif text-[17px] leading-8 text-ink">
                {article.content}
              </div>
            </div>

            {/* Add Comment */}
            <div className="mt-10 border-t border-hairline pt-8">
              <div className="border border-hairline bg-paper p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-press">
                  Editorial Notes
                </p>

                <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">
                  Add Comment
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Add a comment to this article's history.
                </p>

                <form
                  onSubmit={handleAddComment}
                  className="mt-5"
                >
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your comment..."
                    rows={4}
                    className="w-full resize-y border border-hairline bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-muted/70 focus:border-press"
                  />

                  {commentError && (
                    <p className="mt-2 text-sm text-red-700">
                      {commentError}
                    </p>
                  )}

                  {commentSuccess && (
                    <p className="mt-2 text-sm text-green-700">
                      {commentSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={commentLoading}
                    className="mt-4 border border-press bg-press px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#8f2b25] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commentLoading
                      ? "Adding..."
                      : "Add Comment"}
                  </button>
                </form>
              </div>
            </div>

            {/* History */}
            <div className="mt-10 border-t border-hairline pt-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-press">
                  Audit Trail
                </p>

                <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">
                  Article History
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Timeline of article activity and status changes.
                </p>
              </div>

              {historyLoading && (
                <div className="mt-6 border border-hairline bg-paper px-4 py-4">
                  <p className="text-sm text-muted">
                    Loading history...
                  </p>
                </div>
              )}

              {historyError && (
                <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {historyError}
                </div>
              )}

              {!historyLoading &&
                !historyError &&
                history.length === 0 && (
                  <div className="mt-6 border border-hairline bg-paper px-5 py-6">
                    <p className="text-sm text-muted">
                      No history available.
                    </p>
                  </div>
                )}

              {!historyLoading &&
                !historyError &&
                history.length > 0 && (
                  <div className="mt-7 space-y-5">
                    {history.map((item) => (
                      <div
                        key={item._id}
                        className="relative border-l-2 border-hairline pl-6"
                      >
                        <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-press" />

                        <div className="border border-hairline bg-paper p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h3 className="font-serif text-lg font-semibold text-ink">
                              {item.type === "CREATED" &&
                                "Article Created"}

                              {item.type === "STATUS_CHANGE" &&
                                "Status Changed"}

                              {item.type === "REVISION_CREATED" &&
                                "Revision Created"}

                              {item.type ===
                                "REVISION_STATUS_CHANGE" &&
                                "Revision Status Changed"}

                              {item.type === "COMMENT" &&
                                "Comment Added"}
                            </h3>

                            <span className="text-[11px] text-muted">
                              {item.createdAt &&
                                new Date(
                                  item.createdAt
                                ).toLocaleString()}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-muted">
                            By{" "}
                            <span className="font-medium text-ink">
                              {item.actor?.name ||
                                item.actor?.email ||
                                "Unknown user"}
                            </span>
                          </p>

                          {item.type === "STATUS_CHANGE" && (
                            <p className="mt-3 text-sm text-muted">
                              Status:{" "}
                              <span className="font-medium text-ink">
                                {item.oldStatus || "—"}
                              </span>
                              {" → "}
                              <span className="font-medium text-ink">
                                {item.newStatus || "—"}
                              </span>
                            </p>
                          )}

                          {item.type ===
                            "REVISION_STATUS_CHANGE" && (
                            <p className="mt-3 text-sm text-muted">
                              Revision status:{" "}
                              <span className="font-medium text-ink">
                                {item.oldStatus || "—"}
                              </span>
                              {" → "}
                              <span className="font-medium text-ink">
                                {item.newStatus || "—"}
                              </span>
                            </p>
                          )}

                          {item.type === "COMMENT" &&
                            item.comment && (
                              <div className="mt-4 border-l-2 border-press bg-white px-4 py-3 text-sm leading-6 text-muted">
                                {item.comment}
                              </div>
                            )}

                          {item.type === "REVISION_CREATED" &&
                            item.revision && (
                              <p className="mt-3 text-sm text-muted">
                                Revision created for this article.
                              </p>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Revision */}
            {user?.role === "writer" &&
              article.status === "PUBLISHED" &&
              article.author?._id === user?.id && (
                <div className="mt-10 border-t border-hairline pt-8">
                  <div className="border border-hairline bg-paper p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-press">
                      Published Article
                    </p>

                    <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">
                      Create New Revision
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-muted">
                      Create a new revision of this published article.
                    </p>

                    {revisionError && (
                      <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {revisionError}
                      </div>
                    )}

                    <button
                      onClick={handleCreateRevision}
                      disabled={creatingRevision}
                      className="mt-5 border border-press bg-press px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#8f2b25] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingRevision
                        ? "Creating Revision..."
                        : "Create New Revision"}
                    </button>
                  </div>
                </div>
              )}

            {/* Back */}
            <div className="mt-10 border-t border-hairline pt-6">
              <button
                onClick={() => navigate(-1)}
                className="border border-hairline bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:border-press hover:bg-press hover:text-white"
              >
                ← Go Back
              </button>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
};

export default ArticleDetail;