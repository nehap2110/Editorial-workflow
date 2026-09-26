

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton.jsx";

const SectionManagement = () => {
const navigate = useNavigate();

const [sections, setSections] = useState([]);
const [editors, setEditors] = useState([]);
const [editorsError, setEditorsError] = useState("");

const [showArchived, setShowArchived] = useState(false);
const [showCreateForm, setShowCreateForm] = useState(false);
const [editingId, setEditingId] = useState(null);

const [formData, setFormData] = useState({
name: "",
description: "",
owner: "",
});

const [loading, setLoading] = useState(true);
const [creating, setCreating] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

// ==========================================
// FETCH SECTIONS
// ==========================================

const fetchSections = async () => {
try {
setLoading(true);
setError("");


  const response = await api.get(
    `/sections${showArchived ? "?includeArchived=true" : ""}`
  );

  setSections(response.data.sections || []);
} catch (err) {
  console.error("Fetch sections error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to load sections."
  );
} finally {
  setLoading(false);
}


};

// ==========================================
// FETCH EDITORS
// ==========================================

const fetchEditors = async () => {
try {
const response = await api.get("/users/editors");


  setEditorsError("");
  setEditors(response.data.users || []);
} catch (err) {
  console.error("Fetch editors error:", err);

  setEditorsError(
    err.response?.data?.message ||
      "Failed to load editors."
  );
}


};

useEffect(() => {
fetchSections();
}, [showArchived]);

useEffect(() => {
fetchEditors();
}, []);

// ==========================================
// HANDLE INPUT
// ==========================================

const handleChange = (event) => {
const { name, value } = event.target;


setFormData((previous) => ({
  ...previous,
  [name]: value,
}));

setError("");
setSuccess("");


};

// ==========================================
// CREATE SECTION
// ==========================================

const handleCreateSection = async (event) => {
event.preventDefault();


if (!formData.name.trim()) {
  setError("Section name is required.");
  return;
}

if (!formData.description.trim()) {
  setError("Section description is required.");
  return;
}

if (!formData.owner) {
  setError("Please select a section owner.");
  return;
}

try {
  setCreating(true);
  setError("");
  setSuccess("");

  const payload = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    owner: formData.owner,
  };

  if (editingId) {
    // Edit an existing section
    const response = await api.patch(
      `/sections/${editingId}`,
      payload
    );

    const updatedSection = response.data.section;

    setSections((previous) =>
      previous.map((section) =>
        section._id === updatedSection._id
          ? updatedSection
          : section
      )
    );

    setSuccess("Section updated successfully.");
  } else {
    // Create a new section
    const response = await api.post("/sections", payload);

    const createdSection = response.data.section;

    setSections((previous) => [
      createdSection,
      ...previous,
    ]);

    setSuccess("Section created successfully.");
  }

  setFormData({
    name: "",
    description: "",
    owner: "",
  });

  setEditingId(null);
  setShowCreateForm(false);
} catch (err) {
  console.error("Save section error:", err);

  setError(
    err.response?.data?.message ||
      (editingId
        ? "Failed to update section."
        : "Failed to create section.")
  );
} finally {
  setCreating(false);
}


};

// ==========================================
// EDIT (loads a section into the form)
// ==========================================

const handleEditSection = (section) => {
setEditingId(section._id);

setFormData({
  name: section.name || "",
  description: section.description || "",
  owner: section.owner?._id || "",
});

setShowCreateForm(true);
setError("");
setSuccess("");

window.scrollTo({ top: 0, behavior: "smooth" });
};

// ==========================================
// ARCHIVE
// ==========================================

const handleArchive = async (sectionId) => {
const confirmed = window.confirm(
"Are you sure you want to archive this section?"
);

if (!confirmed) return;

try {
  setError("");
  setSuccess("");

  await api.patch(`/sections/${sectionId}/archive`);

  setSuccess("Section archived successfully.");

  fetchSections();
} catch (err) {
  console.error("Archive section error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to archive section."
  );
}


};

// ==========================================
// RESTORE
// ==========================================

const handleRestore = async (sectionId) => {
try {
setError("");
setSuccess("");


  await api.patch(`/sections/${sectionId}/restore`);

  setSuccess("Section restored successfully.");

  fetchSections();
} catch (err) {
  console.error("Restore section error:", err);

  setError(
    err.response?.data?.message ||
      "Failed to restore section."
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
        <p className="font-serif text-2xl text-ink">
          Loading sections
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

        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
          Section Management
        </h1>

        <p className="mt-1 text-sm text-muted">
          Manage editorial sections and their writers.
        </p>
      </div>

      <button
        onClick={() => {
          if (editingId) {
            setEditingId(null);
            setFormData({
              name: "",
              description: "",
              owner: "",
            });
          }

          setShowCreateForm((previous) => !previous);
          setError("");
          setSuccess("");
        }}
        className="border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-press hover:border-press"
      >
        {showCreateForm
          ? "Cancel"
          : "+ Create Section"}
      </button>
    </div>
  </header>

  {/* Main */}
  <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="mb-7">
      <BackButton label="Back to Dashboard" />
    </div>

    {/* Page heading */}
    <div className="mb-8 border-b border-hairline pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Desk Structure
          </p>

          <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
            Editorial Sections
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Organize your publication by managing active sections,
            section owners, and assigned writers.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="font-serif text-3xl font-semibold">
            {sections.length}
          </p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            {sections.length === 1 ? "Section" : "Sections"}
          </p>
        </div>
      </div>
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

    {/* ====================================== */}
    {/* CREATE FORM */}
    {/* ====================================== */}

    {showCreateForm && (
      <section className="mb-8 border border-hairline bg-white">
        <div className="border-b border-hairline px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-press">
            {editingId ? "Edit Section" : "New Section"}
          </p>

          <h2 className="mt-1 font-serif text-2xl font-semibold">
            {editingId
              ? "Edit Editorial Section"
              : "Create Editorial Section"}
          </h2>

          <p className="mt-1 text-sm text-muted">
            {editingId
              ? "Update the section's name, description or owner."
              : "Add a section and assign an editor as its owner."}
          </p>
        </div>

        <form
          onSubmit={handleCreateSection}
          className="px-6 py-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Section Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Technology"
                className="w-full border border-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition placeholder:text-[#9A968A] focus:border-press"
              />
            </div>

            {/* Owner */}
            <div>
              <label
                htmlFor="owner"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Section Owner
              </label>

              <select
                id="owner"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                className="w-full border border-hairline bg-paper px-4 py-3 text-sm text-ink outline-none transition focus:border-press"
              >
                <option value="">
                  Select editor
                </option>

                {editors.map((editor) => (
                  <option
                    key={editor._id}
                    value={editor._id}
                  >
                    {editor.name || editor.email}
                  </option>
                ))}
              </select>

              {editorsError && (
                <p className="mt-2 text-xs text-press">
                  {editorsError}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe this section..."
                className="w-full resize-y border border-hairline bg-paper px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-[#9A968A] focus:border-press"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="border border-ink bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-press hover:border-press disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? editingId
                  ? "Saving..."
                  : "Creating..."
                : editingId
                  ? "Save Changes"
                  : "Create Section"}
            </button>
          </div>
        </form>
      </section>
    )}

    {/* ====================================== */}
    {/* SECTION LIST HEADER */}
    {/* ====================================== */}

    <div className="mb-5 flex flex-col justify-between gap-4 border-b border-hairline pb-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Current Structure
        </p>

        <h3 className="mt-1 font-serif text-2xl font-semibold">
          Sections
        </h3>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) =>
            setShowArchived(event.target.checked)
          }
          className="h-4 w-4 accent-[#A8332B]"
        />

        <span>Show archived sections</span>
      </label>
    </div>

    {/* ====================================== */}
    {/* EMPTY STATE */}
    {/* ====================================== */}

    {sections.length === 0 && (
      <div className="border border-hairline bg-white px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-press">
          No Sections
        </p>

        <h3 className="mt-3 font-serif text-2xl font-semibold">
          No sections found
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Create a section to start organizing your editorial
          workflow and writer assignments.
        </p>

        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-6 border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-press hover:border-press"
        >
          + Create Section
        </button>
      </div>
    )}

    {/* ====================================== */}
    {/* SECTION LIST */}
    {/* ====================================== */}

    {sections.length > 0 && (
      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section._id}
            className="group border border-hairline bg-white transition hover:border-[#C9C5B9]"
          >
            {/* Card top */}
            <div className="border-b border-hairline px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Section
                  </p>

                  <h3 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                    {section.name}
                  </h3>
                </div>

                <span
                  className={`shrink-0 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
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

              <p className="mt-3 text-sm leading-6 text-muted">
                {section.description}
              </p>
            </div>

            {/* Owner */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Owner
                  </p>

                  <p className="mt-1 text-sm font-medium text-ink">
                    {section.owner?.name ||
                      section.owner?.email ||
                      "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Writers
                  </p>

                  <p className="mt-1 text-sm font-medium text-ink">
                    {section.writers?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Writers */}
            <div className="border-t border-hairline px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Assigned Writers
              </p>

              {section.writers?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.writers.map((writer) => (
                    <span
                      key={writer._id}
                      className="border border-hairline bg-paper px-3 py-1.5 text-xs text-muted"
                    >
                      {writer.name || writer.email}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm italic text-muted">
                  No writers assigned.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 border-t border-hairline px-6 py-4">
              {!section.archived && (
                <>
                  <button
                    onClick={() =>
                      navigate(
                        `/editor/sections/${section._id}`
                      )
                    }
                    className="border border-ink px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
                  >
                    Manage
                  </button>

                  <button
                    onClick={() =>
                      handleEditSection(section)
                    }
                    className="border border-ink px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleArchive(section._id)
                    }
                    className="border border-press px-4 py-2 text-sm font-semibold text-press transition hover:bg-press hover:text-paper"
                  >
                    Archive
                  </button>
                </>
              )}

              {section.archived && (
                <button
                  onClick={() =>
                    handleRestore(section._id)
                  }
                  className="border border-ink px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
                >
                  Restore
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    )}
  </main>
</div>


);
};

export default SectionManagement;