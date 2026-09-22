import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton.jsx";

const SectionDetail = () => {
const { id } = useParams();
const navigate = useNavigate();

const [section, setSection] = useState(null);
const [writers, setWriters] = useState([]);
const [selectedWriter, setSelectedWriter] = useState("");

const [articles, setArticles] = useState([]);
const [articlesTotal, setArticlesTotal] = useState(0);
const [articlesLoading, setArticlesLoading] = useState(true);
const [articlesError, setArticlesError] = useState("");

const [loading, setLoading] = useState(true);
const [assigning, setAssigning] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

// ==========================================
// FETCH SECTION
// ==========================================

const fetchSection = async () => {
try {
setLoading(true);
setError("");


  const response = await api.get(`/sections/${id}`);

  setSection(response.data.section);
} catch (err) {
  console.error("Fetch section error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to load section."
  );
} finally {
  setLoading(false);
}


};

// ==========================================
// FETCH WRITERS
// ==========================================

const fetchWriters = async () => {
try {
const response = await api.get("/users/writers");


  setWriters(response.data.users || []);
} catch (err) {
  console.error("Fetch writers error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to load writers."
  );
}


};

// ==========================================
// FETCH SECTION'S ARTICLES
// ==========================================

const fetchArticles = async () => {
try {
setArticlesLoading(true);
setArticlesError("");

  const response = await api.get(
    `/articles?section=${id}&limit=50&sortBy=updatedAt&order=desc`
  );

  setArticles(response.data.articles || []);
  setArticlesTotal(
    response.data.pagination?.total ??
      (response.data.articles || []).length
  );
} catch (err) {
  console.error("Fetch section articles error:", err);

  setArticlesError(
    err.response?.data?.message ||
      "Failed to load articles."
  );
} finally {
  setArticlesLoading(false);
}
};

useEffect(() => {
fetchSection();
fetchWriters();
fetchArticles();
}, [id]);

// ==========================================
// ASSIGN WRITER
// ==========================================

const handleAssignWriter = async () => {
if (!selectedWriter) {
setError("Please select a writer.");
return;
}


try {
  setAssigning(true);
  setError("");
  setSuccess("");

  const response = await api.post(
    `/sections/${id}/writers/${selectedWriter}`
  );

  setSection(response.data.section);

  setSelectedWriter("");

  setSuccess("Writer assigned successfully.");
} catch (err) {
  console.error("Assign writer error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to assign writer."
  );
} finally {
  setAssigning(false);
}


};

// ==========================================
// REMOVE WRITER
// ==========================================

const handleRemoveWriter = async (writerId) => {
const confirmed = window.confirm(
"Are you sure you want to remove this writer from the section?"
);


if (!confirmed) {
  return;
}

try {
  setError("");
  setSuccess("");

  const response = await api.delete(
    `/sections/${id}/writers/${writerId}`
  );

  setSection(response.data.section);

  setSuccess("Writer removed successfully.");
} catch (err) {
  console.error("Remove writer error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to remove writer."
  );
}


};

// ==========================================
// LOADING
// ==========================================

if (loading) {
return ( <div className="min-h-screen bg-paper font-sans text-ink antialiased"> <div className="h-[3px] bg-press" />


    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center">
        <p className="font-serif text-2xl">
          Loading section
        </p>

        <p className="mt-2 text-sm text-muted">
          Preparing the editorial desk...
        </p>
      </div>
    </div>
  </div>
);


}

// ==========================================
// ERROR / NO SECTION
// ==========================================

if (!section) {
return ( <div className="min-h-screen bg-paper font-sans text-ink antialiased"> <div className="h-[3px] bg-press" />


    <main className="mx-auto max-w-6xl px-6 py-10">
      {error && (
        <div className="mb-6 border-l-4 border-press bg-[#F5E9E6] px-4 py-3 text-sm text-press">
          {error}
        </div>
      )}

      <BackButton label="Back to Sections" />
    </main>
  </div>
);


}

// ==========================================
// GET ASSIGNED WRITER IDS
// ==========================================

const assignedWriterIds =
section.writers?.map((writer) =>
writer._id.toString()
) || [];

// ==========================================
// PAGE
// ==========================================

return ( <div className="min-h-screen bg-paper font-sans text-ink antialiased"> <div className="h-[3px] bg-press" />


  {/* Header */}
  <header className="border-b border-hairline">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-press">
          Editorial Desk
        </p>

        <h1 className="mt-1 font-serif text-2xl font-semibold">
          Manage Section
        </h1>

        <p className="mt-1 text-sm text-muted">
          Writer assignments and section oversight.
        </p>
      </div>

      <span
        className={`shrink-0 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
          section.archived
            ? "border-hairline bg-paper text-muted"
            : "border-[#C9C5B9] bg-[#EFEEE8] text-ink"
        }`}
      >
        {section.archived
          ? "Archived"
          : "Active"}
      </span>
    </div>
  </header>

  <main className="mx-auto max-w-6xl px-6 py-8">
    {/* Back */}
    <div className="mb-7">
      <BackButton label="Back to Sections" />
    </div>

    {/* Page heading */}
    <div className="mb-8 border-b border-hairline pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Section Overview
      </p>

      <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
        {section.name}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {section.description}
      </p>
    </div>

    {/* Messages */}
    {error && (
      <div className="mb-6 border-l-4 border-press bg-[#F5E9E6] px-4 py-3 text-sm text-press">
        {error}
      </div>
    )}

    {success && (
      <div className="mb-6 border-l-4 border-ink bg-[#EFEEE8] px-4 py-3 text-sm text-ink">
        {success}
      </div>
    )}

    {/* ====================================
        SECTION INFORMATION
    ==================================== */}

    <section className="border border-hairline bg-white">
      <div className="border-b border-hairline px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-press">
          Section Information
        </p>

        <h3 className="mt-1 font-serif text-2xl font-semibold">
          Editorial Ownership
        </h3>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Section Owner
          </p>

          <p className="mt-2 text-sm font-semibold text-ink">
            {section.owner?.name ||
              section.owner?.email ||
              "Unknown"}
          </p>

          {section.owner?.email && (
            <p className="mt-1 text-xs text-muted">
              {section.owner.email}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Assigned Writers
          </p>

          <p className="mt-2 font-serif text-2xl font-semibold">
            {section.writers?.length || 0}
          </p>
        </div>
      </div>
    </section>

    {/* ====================================
        ARTICLES IN THIS SECTION
    ==================================== */}

    <section className="mt-6 border border-hairline bg-white">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-press">
            Editorial Content
          </p>

          <h3 className="mt-1 font-serif text-2xl font-semibold">
            Articles
          </h3>

          <p className="mt-1 text-sm text-muted">
            Articles that belong to this section.
          </p>
        </div>

        <span className="border border-hairline bg-paper px-3 py-1.5 font-serif text-lg font-semibold">
          {articlesTotal}
        </span>
      </div>

      {articlesError && (
        <div className="mx-6 mt-5 border-l-4 border-press bg-[#F5E9E6] px-4 py-3 text-sm text-press">
          {articlesError}
        </div>
      )}

      {articlesLoading ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm text-muted">
            Loading articles...
          </p>
        </div>
      ) : articles.length === 0 ? (
        !articlesError && (
          <div className="px-6 py-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-press">
              No Articles
            </p>

            <p className="mt-2 text-sm text-muted">
              No articles have been created in this section yet.
            </p>
          </div>
        )
      ) : (
        <div className="divide-y divide-hairline">
          {articles.map((article) => (
            <button
              key={article._id}
              type="button"
              onClick={() =>
                navigate(`/articles/${article._id}`)
              }
              className="flex w-full flex-col gap-2 px-6 py-5 text-left transition hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-lg font-semibold text-ink">
                  {article.title}
                </p>

                <p className="mt-1 text-xs text-muted">
                  By{" "}
                  {article.author?.name ||
                    article.author?.email ||
                    "Unknown"}
                </p>
              </div>

              <span className="shrink-0 self-start border border-hairline bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink sm:self-auto">
                {article.status}
              </span>
            </button>
          ))}

          {articlesTotal > articles.length && (
            <p className="px-6 py-4 text-xs text-muted">
              Showing {articles.length} of {articlesTotal}{" "}
              articles.
            </p>
          )}
        </div>
      )}
    </section>

    {/* ====================================
        ASSIGN WRITER
    ==================================== */}

    {!section.archived && (
      <section className="mt-6 border border-hairline bg-white">
        <div className="border-b border-hairline px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-press">
            Assignment
          </p>

          <h3 className="mt-1 font-serif text-2xl font-semibold">
            Assign Writer
          </h3>

          <p className="mt-1 text-sm text-muted">
            Add a writer to this editorial section.
          </p>
        </div>

        <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row">
          <select
            value={selectedWriter}
            onChange={(event) =>
              setSelectedWriter(event.target.value)
            }
            disabled={assigning}
            className="flex-1 border border-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition focus:border-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              Select writer
            </option>

            {writers
              .filter(
                (writer) =>
                  !assignedWriterIds.includes(
                    writer._id.toString()
                  )
              )
              .map((writer) => (
                <option
                  key={writer._id}
                  value={writer._id}
                >
                  {writer.name || writer.email}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={handleAssignWriter}
            disabled={assigning || !selectedWriter}
            className="border border-ink bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:border-press hover:bg-press disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning
              ? "Assigning..."
              : "Assign Writer"}
          </button>
        </div>
      </section>
    )}

    {/* ====================================
        ASSIGNED WRITERS
    ==================================== */}

    <section className="mt-6 border border-hairline bg-white">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            Current Team
          </p>

          <h3 className="mt-1 font-serif text-2xl font-semibold">
            Assigned Writers
          </h3>

          <p className="mt-1 text-sm text-muted">
            Writers currently assigned to this section.
          </p>
        </div>

        <span className="border border-hairline bg-paper px-3 py-1.5 font-serif text-lg font-semibold">
          {section.writers?.length || 0}
        </span>
      </div>

      {/* No writers */}
      {!section.writers ||
      section.writers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-press">
            No Assignments
          </p>

          <p className="mt-2 text-sm text-muted">
            No writers are currently assigned to this section.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {section.writers.map((writer) => (
            <div
              key={writer._id}
              className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-serif text-lg font-semibold">
                  {writer.name || "Unnamed Writer"}
                </p>

                <p className="mt-1 text-xs text-muted">
                  {writer.email}
                </p>
              </div>

              {!section.archived && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveWriter(writer._id)
                  }
                  className="self-start border border-press px-4 py-2 text-sm font-semibold text-press transition hover:bg-press hover:text-paper sm:self-auto"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  </main>
</div>


);
};

export default SectionDetail;