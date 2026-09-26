import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton.jsx";

const ArticleEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    section: "",
    content: "",
  });

  const [status, setStatus] = useState("DRAFT");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  
  // FETCH ARTICLE WHEN EDITING
  
  // FETCH SECTIONS THIS USER MAY CREATE ARTICLES IN
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setSectionsLoading(true);
        setSectionsError("");

        const response = await api.get("/sections");

        setSections(response.data.sections || []);
      } catch (err) {
        console.error("Fetch sections error:", err);

        setSectionsError(
          err.response?.data?.message ||
            "Failed to load sections."
        );
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchSections();
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const fetchArticle = async () => {
      try {
        setFetching(true);
        setError("");

        const response = await api.get(`/articles/${id}`);
        const article = response.data.article;

        if (
          article.status !== "DRAFT" &&
          article.status !== "CHANGES_REQUESTED"
        ) {
          setError(
            `This article cannot be edited because its status is ${article.status}.`
          );
          return;
        }

        setFormData({
          title: article.title || "",
          summary: article.summary || "",
          section: article.section?._id || article.section || "",
          content: article.content || "",
        });

        setStatus(article.status);
      } catch (err) {
        console.error("Fetch article error:", err);

        setError(
          err.response?.data?.message ||
            "Failed to load article."
        );
      } finally {
        setFetching(false);
      }
    };

    fetchArticle();
  }, [id, isEditing]);

  
  // HANDLE INPUT
  
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  
  // VALIDATE FORM
  const validateForm = () => {
    if (!formData.title.trim()) {
      return "Title is required.";
    }

    if (!formData.content.trim()) {
      return "Content is required.";
    }

    if (!formData.section.trim()) {
      return "Section is required.";
    }

    return null;
  };

  
  // SAVE ARTICLE
  
  const handleSave = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      let response;

      if (isEditing) {
        response = await api.patch(
          `/articles/${id}`,
          formData
        );
      } else {
        response = await api.post(
          "/articles",
          formData
        );
      }

      const article = response.data.article;

      if (!article || !article._id) {
        throw new Error(
          "Article was saved but no article ID was returned."
        );
      }

      setStatus(article.status);

      setSuccess(
        isEditing
          ? "Article updated successfully."
          : "Article saved as draft successfully."
      );

      if (!isEditing) {
        navigate(
          `/articles/${article._id}/edit`,
          {
            replace: true,
          }
        );
      }
    } catch (err) {
      console.error("Save article error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save article."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SUBMIT ARTICLE
  // ==========================================
  const handleSubmit = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    // New article must first be saved
    if (!id) {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const createResponse = await api.post(
          "/articles",
          formData
        );

        const article = createResponse.data.article;

        const submitResponse = await api.post(
          `/articles/${article._id}/submit`
        );

        setStatus(submitResponse.data.article.status);

        setSuccess(
          "Article submitted for review successfully."
        );

        navigate(`/articles/${article._id}/edit`, {
          replace: true,
        });
      } catch (err) {
        console.error("Submit article error:", err);

        setError(
          err.response?.data?.message ||
            "Failed to submit article."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // Existing article
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/articles/${id}/submit`
      );

      setStatus(response.data.article.status);

      setSuccess(
        "Article submitted for review successfully."
      );

      navigate("/articles/my");
    } catch (err) {
      console.error("Submit article error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to submit article."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STATUS STYLING
  // ==========================================
  const getStatusStyle = () => {
    if (status === "CHANGES_REQUESTED") {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }

    if (status === "SUBMITTED") {
      return "border-blue-200 bg-blue-50 text-blue-800";
    }

    if (status === "APPROVED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    return "border-hairline bg-paper text-muted";
  };

  
  // LOADING
  
  if (fetching) {
    return (
      <div className="min-h-screen bg-paper font-sans text-ink antialiased">
        <div className="h-[3px] bg-press" />

        <header className="border-b border-hairline bg-paper">
          <div className="mx-auto max-w-6xl px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-press">
              Editorial Workflow
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
              Loading article
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16">
          <div className="border-y border-hairline py-10 text-center">
            <p className="text-sm text-muted">
              Loading article...
            </p>
          </div>
        </main>
      </div>
    );
  }

  
  // PAGE
  
  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      {/* Top editorial accent */}
      <div className="h-[3px] bg-press" />

      {/* Header */}
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-press">
              Editorial Workflow
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
              {isEditing
                ? "Edit Article"
                : "Create Article"}
            </h1>

            <p className="mt-1 text-sm text-muted">
              Write, refine and submit your story for editorial review.
            </p>
          </div>

          <div
            className={`hidden items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] sm:flex ${getStatusStyle()}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.replaceAll("_", " ")}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-7">
          <BackButton />
        </div>

        {/* Mobile status */}
        <div className="mb-6 sm:hidden">
          <div
            className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusStyle()}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.replaceAll("_", " ")}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 border-l-[3px] border-press bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-press">
              Something went wrong
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 border-l-[3px] border-emerald-700 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-800">
              Success
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {success}
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* Editor */}
          <section className="border border-hairline bg-white">
            <div className="border-b border-hairline px-6 py-5 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-press">
                Story Draft
              </p>

              <h2 className="mt-1 font-serif text-2xl font-semibold">
                {isEditing
                  ? "Refine your article"
                  : "Start your article"}
              </h2>
            </div>

            <div className="px-6 py-7 sm:px-8">
              {/* Title */}
              <div className="mb-7">
                <label
                  htmlFor="title"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Title <span className="text-press">*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter a clear and compelling headline"
                  className="w-full border-0 border-b border-hairline bg-transparent px-0 py-3 font-serif text-2xl font-semibold text-ink outline-none transition placeholder:text-stone-400 focus:border-press sm:text-3xl"
                />
              </div>

              {/* Section */}
              <div className="mb-7">
                <label
                  htmlFor="section"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Section <span className="text-press">*</span>
                </label>

                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full border border-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition focus:border-press focus:ring-1 focus:ring-press/20"
                >
                  <option value="">
                    {sectionsLoading
                      ? "Loading sections..."
                      : "Select section"}
                  </option>

                  {sections.map((section) => (
                    <option
                      key={section._id}
                      value={section._id}
                    >
                      {section.name}
                    </option>
                  ))}
                </select>

                {!sectionsLoading &&
                  !sectionsError &&
                  sections.length === 0 && (
                    <p className="mt-2 text-xs text-muted">
                      You are not assigned to any section yet.
                      An editor needs to assign you to a
                      section before you can create an article.
                    </p>
                  )}

                {sectionsError && (
                  <p className="mt-2 text-xs text-press">
                    {sectionsError}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="mb-7">
                <label
                  htmlFor="summary"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Summary
                </label>

                <textarea
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  placeholder="Write a short summary that captures the key point of the story..."
                  rows={4}
                  className="w-full resize-none border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-stone-400 focus:border-press focus:ring-1 focus:ring-press/20"
                />

                <p className="mt-2 text-xs text-muted">
                  Give readers a quick understanding of what this article is about.
                </p>
              </div>

              {/* Content */}
              <div className="mb-2">
                <label
                  htmlFor="content"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Article Content <span className="text-press">*</span>
                </label>

                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Write your article here..."
                  rows={18}
                  className="w-full resize-y border border-hairline bg-paper px-4 py-4 text-[15px] leading-7 text-ink outline-none transition placeholder:text-stone-400 focus:border-press focus:ring-1 focus:ring-press/20"
                />

                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>
                    Write clearly and keep the article well structured.
                  </span>

                  <span>
                    {formData.content.length} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 border-t border-hairline bg-paper px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
                className="border border-hairline bg-white px-5 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                {(status === "DRAFT" ||
                  status === "CHANGES_REQUESTED") && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="border border-ink bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : "Save Draft"}
                  </button>
                )}

                {(status === "DRAFT" ||
                  status === "CHANGES_REQUESTED") && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-press px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8f2923] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Submitting..."
                      : "Submit for Review"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Editorial sidebar */}
          <aside className="h-fit border-y border-hairline">
            <div className="border-b border-hairline py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-press">
                Editorial Notes
              </p>
            </div>

            <div className="space-y-6 py-5">
              <div>
                <p className="font-serif text-lg font-semibold">
                  Before you submit
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Make sure your headline, section and article content
                  are complete before sending the story for review.
                </p>
              </div>

              <div className="border-t border-hairline pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Required
                </p>

                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li className="flex gap-2">
                    <span className="text-press">•</span>
                    Article title
                  </li>

                  <li className="flex gap-2">
                    <span className="text-press">•</span>
                    Section
                  </li>

                  <li className="flex gap-2">
                    <span className="text-press">•</span>
                    Article content
                  </li>
                </ul>
              </div>

              <div className="border-t border-hairline pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Workflow
                </p>

                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center border border-hairline text-xs">
                      1
                    </span>
                    <span className="text-muted">
                      Save as draft
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center border border-hairline text-xs">
                      2
                    </span>
                    <span className="text-muted">
                      Submit for review
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center border border-hairline text-xs">
                      3
                    </span>
                    <span className="text-muted">
                      Editor approval
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ArticleEditor;