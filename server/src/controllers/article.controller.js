const Article = require("../models/Article");
const Section = require("../models/Section");
const ArticleRevision = require("../models/ArticleRevision");
const User = require("../models/User");
const ArticleHistory = require("../models/ArticleHistory");


const createHistory = async ({
  article,
  type,
  actor,
  oldStatus = null,
  newStatus = null,
  revision = null,
  comment = null,
}) => {
  await ArticleHistory.create({
    article,
    type,
    actor,
    oldStatus,
    newStatus,
    revision,
    comment,
  });
};


const STATUS = {
  DRAFT: "DRAFT",
  IN_REVIEW: "SUBMITTED",
  APPROVED: "APPROVED",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
};

const allowedTransitions = {
  DRAFT: ["SUBMITTED"],
  CHANGES_REQUESTED: ["SUBMITTED"],
  SUBMITTED: ["APPROVED"],
  APPROVED: ["SCHEDULED", "PUBLISHED"],
  SCHEDULED: ["APPROVED", "PUBLISHED"],
  PUBLISHED: [],
};

const canTransition = (from, to) => {
  return allowedTransitions[from]?.includes(to) || false;
};


// ==========================================
// CREATE ARTICLE
// POST /api/articles
// Writer only
// ==========================================
const createArticle = async (req, res, next) => {
  try {
    const { title, content, summary, section, author } = req.body;

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (!title?.trim() || !content?.trim() || !section) {
      return res.status(400).json({
        message: "Title, content and section are required",
      });
    }

    // ==========================================
    // FIND SECTION
    // ==========================================

    const selectedSection = await Section.findById(section);

    if (!selectedSection) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    // Archived sections cannot receive new articles
    if (selectedSection.archived) {
      return res.status(400).json({
        message:
          "Cannot create an article in an archived section",
      });
    }

    // ==========================================
    // DETERMINE ARTICLE AUTHOR
    // ==========================================

    let articleAuthor;

    // ------------------------------------------
    // WRITER CREATE FLOW
    // ------------------------------------------

    if (req.user.role === "writer") {
      articleAuthor = req.user._id;

      // Writer must be assigned to selected section
      const isAssigned = selectedSection.writers.some(
        (writerId) =>
          writerId.toString() ===
          req.user._id.toString()
      );

      if (!isAssigned) {
        return res.status(403).json({
          message:
            "You are not assigned to this section",
        });
      }
    }

    // ------------------------------------------
    // EDITOR CREATE FLOW
    // ------------------------------------------

    else if (req.user.role === "editor") {
      // Editor must select a writer
      if (!author) {
        return res.status(400).json({
          message:
            "Please select a writer for the article",
        });
      }

      // Find selected writer
      const selectedWriter = await User.findOne({
        _id: author,
        role: "writer",
      });

      if (!selectedWriter) {
        return res.status(400).json({
          message:
            "Selected author is not a valid writer",
        });
      }

      // Selected writer must be assigned to selected section
      const isWriterAssigned = selectedSection.writers.some(
        (writerId) =>
          writerId.toString() ===
          selectedWriter._id.toString()
      );

      if (!isWriterAssigned) {
        return res.status(400).json({
          message:
            "Selected writer is not assigned to this section",
        });
      }

      articleAuthor = selectedWriter._id;
    }

    // ==========================================
    // INVALID ROLE
    // ==========================================

    else {
      return res.status(403).json({
        message: "You are not allowed to create articles",
      });
    }

    // ==========================================
    // CREATE ARTICLE
    // ==========================================

    const article = await Article.create({
      title: title.trim(),
      content: content.trim(),
      summary: summary?.trim() || "",
      section: selectedSection._id,

      // IMPORTANT:
      // Writer → logged-in writer
      // Editor → selected writer
      author: articleAuthor,

      status: "DRAFT",
    });

    //history create

    await createHistory({
     article: article._id,
     type: "CREATED",
     actor: req.user._id,
     newStatus: "DRAFT",
     });

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const populatedArticle = await Article.findById(
      article._id
    )
      .populate(
        "author",
        "name email role"
      )
      .populate(
        "section",
        "name description owner"
      );

    return res.status(201).json({
      message: "Article created successfully",
      article: populatedArticle,
    });

  } catch (error) {
    next(error);
  }
};
// ==========================================
// GET MY ARTICLES
// GET /api/articles/my
// Writer only
// ==========================================
const getMyArticles = async (req, res) => {
  try {
   const articles = await Article.find({
  author: req.user._id,
})
  .populate("author", "name email role")
  .populate("section", "name description")
  .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("Get my articles error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching your articles",
    });
  }
};


// ==========================================
// FIND / SEARCH ARTICLES
// GET /api/articles
// Server-side search, filters, sorting, pagination
// ==========================================
const getArticles = async (req, res, next) => {
  try {
    const {
      search = "",
      section,
      status,
      author,
      sortBy = "updatedAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );

    const query = {};

    // ------------------------------------------
    // SEARCH: title + body/content
    // ------------------------------------------
    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      query.$or = [
        {
          title: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          content: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    // ------------------------------------------
    // SECTION FILTER
    // ------------------------------------------
    if (section) {
      query.section = section;
    }

    // ------------------------------------------
    // STATUS FILTER
    // ------------------------------------------
    if (status) {
      query.status = status;
    }

    // ------------------------------------------
    // AUTHOR FILTER
    // ------------------------------------------
    if (author) {
      query.author = author;
    }

    // ------------------------------------------
    // VISIBILITY
    // ------------------------------------------
    // Writers can see only their own articles.
    // Editors can see all articles.
   if (req.user.role === "writer") {
    const sections = await Section.find({
        writers: req.user._id,
        archived: false,
    }).select("_id");

    const sectionIds = sections.map((s) => s._id);

    // Writer can only see articles
    // from their assigned sections
    if (section) {
        const isAssigned = sectionIds.some(
            (id) => id.toString() === section.toString()
        );

        if (!isAssigned) {
            return res.status(200).json({
                success: true,
                articles: [],
                pagination: {
                    page: currentPage,
                    limit: perPage,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            });
        }

        // Keep requested section filter
        query.section = section;
    } else {
        query.section = { $in: sectionIds };
    }
}

    // ------------------------------------------
    // SORTING
    // ------------------------------------------
    const allowedSortFields = {
      updatedAt: "updatedAt",
      status: "status",
      publishTime: "publishedAt",
    };

    const sortField =
      allowedSortFields[sortBy] || "updatedAt";

    const sortOrder = order === "asc" ? 1 : -1;

    const skip = (currentPage - 1) * perPage;

    // ------------------------------------------
    // TOTAL + PAGINATED RESULTS
    // ------------------------------------------
    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate("author", "name email role")
        .populate("section", "name description")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(perPage),

      Article.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return res.status(200).json({
      success: true,
      articles,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE ARTICLE
// GET /api/articles/:id
// Authenticated users
// ==========================================
const getArticle = async (req, res) => {
  try {
    const { id } = req.params;

   const article = await Article.findById(id)
  .populate("author", "name email role")
  .populate("editor", "name email role")
  .populate("section", "name description owner");

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // ======================================
    // WRITER AUTHORIZATION
    // ======================================
    if (req.user.role === "writer") {
    const section = await Section.findOne({
        _id: article.section._id || article.section,
        writers: req.user._id,
        archived: false
    });

    if (!section) {
        return res.status(403).json({
            success:false,
            message: "You are not authorized to view this article"
        });
    }
}

    // ======================================
    // EDITOR
    // ======================================
    // Editors can view articles that need
    // editorial review and published articles.
    // No extra restriction needed here.

    return res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Get article error:", error);

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the article",
    });
  }
};

// ==========================================
// UPDATE ARTICLE
// PATCH /api/articles/:id
// Writer only
// ==========================================
const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, section } = req.body;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    const isEditor = req.user.role === "editor";
    const isAuthor =
      article.author.toString() === req.user._id.toString();

    // Writer can edit only their own article
    if (!isEditor && !isAuthor) {
      return res.status(403).json({
        message: "You can only edit your own articles",
      });
    }

    // Published articles cannot be edited directly
    if (article.status === "PUBLISHED") {
      return res.status(400).json({
        message:
          "Published articles cannot be edited directly. Create a new revision.",
      });
    }

    // Validate section if section is being changed
    if (section !== undefined) {
      const selectedSection = await Section.findById(section);

      if (!selectedSection) {
        return res.status(404).json({
          message: "Section not found",
        });
      }

      if (selectedSection.archived) {
        return res.status(400).json({
          message: "Cannot move an article to an archived section",
        });
      }

      // Writer can only move/create in assigned sections
      if (!isEditor) {
        const isAssigned = selectedSection.writers.some(
          (writerId) =>
            writerId.toString() === req.user._id.toString()
        );

        if (!isAssigned) {
          return res.status(403).json({
            message: "You are not assigned to this section",
          });
        }
      }

      article.section = selectedSection._id;
    }

    if (title !== undefined) {
      article.title = title.trim();
    }

    if (content !== undefined) {
      article.content = content;
    }

    // Editing an approved or scheduled article
    // sends it back to In Review.
   if (
    article.status === "APPROVED" ||
    article.status === "SCHEDULED"
) {
    article.status = "SUBMITTED";
}

    await article.save();

    const updatedArticle = await Article.findById(article._id)
      .populate("author", "name email role")
      .populate("section", "name description owner");

    return res.status(200).json({
      message: "Article updated successfully",
      article: updatedArticle,
    });
  } catch (error) {
    next(error);
  }
};
// ==========================================
// SUBMIT ARTICLE FOR REVIEW
// POST /api/articles/:id/submit
// Writer only
// ==========================================
const submitArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    const isAuthor =
      article.author.toString() === req.user._id.toString();

    if (!isAuthor) {
      return res.status(403).json({
        message: "Only the article author can submit this article",
      });
    }

    if (!canTransition(article.status, STATUS.IN_REVIEW)) {
      return res.status(400).json({
        message: `Cannot move article from ${article.status} to IN REVIEW`,
      });
    }

    const oldStatus = article.status;


    article.status = STATUS.IN_REVIEW;
    article.submittedAt = new Date();

    article.editorFeedback = "";

    await article.save();

    await createHistory({
     article: article._id,
     type: "STATUS_CHANGE",
     actor: req.user._id,
     oldStatus,
      newStatus: STATUS.IN_REVIEW,
    });

    return res.status(200).json({
      message: "Article submitted for review",
      article,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ARTICLES FOR EDITOR REVIEW
// GET /api/articles/review
// Editor only
// ==========================================
const getReviewArticles = async (req, res) => {
  try {
    const articles = await Article.find({
      status: "SUBMITTED",
    })
      .populate("author", "name email role")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("Get review articles error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching review articles",
    });
  }
};




// ==========================================
// GET APPROVED ARTICLES
// GET /api/articles/approved
// Editor only
// ==========================================
const getApprovedArticles = async (req, res) => {
  try {
    const articles = await Article.find({
      status: "APPROVED",
    })
      .populate("author", "name email role")
      .populate("approvedBy", "name email role")
      .sort({ approvedAt: -1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("Get approved articles error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while fetching approved articles",
    });
  }
};


// ==========================================
// REQUEST CHANGES
// POST /api/articles/:id/request-changes
// Editor only
// ==========================================
const requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    if (article.status !== "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted articles can have changes requested",
      });
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback is required",
      });
    }
    const oldStatus = article.status;
    article.status = "CHANGES_REQUESTED";

    // We'll use this field for now.
    article.editorFeedback = feedback.trim();

    await article.save();
    await createHistory({
    article: article._id,
    type: "STATUS_CHANGE",
    actor: req.user._id,
    oldStatus,
    newStatus: "CHANGES_REQUESTED",
    comment: feedback.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Changes requested successfully",
      article,
    });
  } catch (error) {
    console.error("Request changes error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while requesting changes",
    });
  }
};


// ==========================================
// APPROVE ARTICLE
// POST /api/articles/:id/approve
// Editor only
// ==========================================
const approveArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can approve articles",
      });
    }

    const isAuthor =
      article.author.toString() === req.user._id.toString();

    if (isAuthor) {
      return res.status(403).json({
        message: "An editor cannot approve their own article",
      });
    }

    if (!canTransition(article.status, STATUS.APPROVED)) {
      return res.status(400).json({
        message: `Only an article in IN REVIEW can be approved. Current status: ${article.status}`,
      });
    }

      const oldStatus = article.status;

    article.status = STATUS.APPROVED;
    article.approvedAt = new Date();
    article.approvedBy = req.user._id;
    article.reviewedAt = new Date();

    await article.save();

    await createHistory({
   article: article._id,
  type: "STATUS_CHANGE",
    actor: req.user._id,
   oldStatus,
    newStatus: STATUS.APPROVED,
   });

    return res.status(200).json({
      message: "Article approved successfully",
      article,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCHEDULE ARTICLE
// POST /api/articles/:id/schedule
// Editor only
// ==========================================
const scheduleArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publishAt } = req.body;

    if (!publishAt) {
      return res.status(400).json({
        message: "Future publish time is required",
      });
    }

    const publishDate = new Date(publishAt);

    if (Number.isNaN(publishDate.getTime())) {
      return res.status(400).json({
        message: "Invalid publish time",
      });
    }

    if (publishDate <= new Date()) {
      return res.status(400).json({
        message: "Scheduled publish time must be in the future",
      });
    }

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can schedule articles",
      });
    }

    if (!canTransition(article.status, STATUS.SCHEDULED)) {
      return res.status(400).json({
        message: `Only an APPROVED article can be scheduled. Current status: ${article.status}`,
      });
    }
    
    const oldStatus = article.status;
    article.status = STATUS.SCHEDULED;
    article.scheduledAt = publishDate;
    article.scheduledBy = req.user._id;

    article.overdueAlertDismissed = false;
    article.overdueAlertDismissedAt = null;
    article.overdueAlertDismissedBy = null;

    await article.save();

    await createHistory({
    article: article._id,
    type: "STATUS_CHANGE",
    actor: req.user._id,
    oldStatus,
    newStatus: STATUS.SCHEDULED,
    });

    return res.status(200).json({
      message: "Article scheduled successfully",
      article,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// PUBLISH ARTICLE
// POST /api/articles/:id/publish
// Editor only
// ==========================================
const publishArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can publish articles",
      });
    }

    if (!canTransition(article.status, STATUS.PUBLISHED)) {
      return res.status(400).json({
        message: `Only an APPROVED or SCHEDULED article can be published. Current status: ${article.status}`,
      });
    }

    const now = new Date();
    const oldStatus = article.status;

article.status = STATUS.PUBLISHED;
article.publishedAt = now;
article.publishedBy = req.user._id;

article.scheduledAt = null;
article.scheduledBy = null;

article.overdueAlertDismissed = false;
article.overdueAlertDismissedAt = null;
article.overdueAlertDismissedBy = null;

await article.save();

await createHistory({
  article: article._id,
  type: "STATUS_CHANGE",
  actor: req.user._id,
  oldStatus,
  newStatus: STATUS.PUBLISHED,
});
    

    return res.status(200).json({
      message: "Article published successfully",
      article,
    });
  } catch (error) {
    next(error);
  }
};
//unpublish article

const unpublishArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can unpublish articles",
      });
    }

   if (
  article.status !== "PUBLISHED" &&
  article.status !== "SCHEDULED"
) {
  return res.status(400).json({
    message:
      `Only a SCHEDULED or PUBLISHED article can be unpublished. Current status: ${article.status}`,
  });
}

    const oldStatus = article.status;
    article.status = STATUS.APPROVED;
    article.scheduledAt = null;
    article.scheduledBy = null;


    article.overdueAlertDismissed = false;
    article.overdueAlertDismissedAt = null;
    article.overdueAlertDismissedBy = null;

     await article.save();

     await createHistory({
  article: article._id,
  type: "STATUS_CHANGE",
  actor: req.user._id,
  oldStatus,
  newStatus: STATUS.APPROVED,
});

    return res.status(200).json({
      message: "Article unpublished successfully",
      article,
    });
  } catch (error) {
    next(error);
  }
};



// ==========================================
// GET PUBLISHED ARTICLES
// GET /api/articles/published
// Authenticated users
// ==========================================
const getPublishedArticles = async (req, res) => {
  try {
    const query = {
      status: "PUBLISHED",
    };

    // Writers only see published articles from the sections they are
    // assigned to (same visibility rule as getArticles, getArticle and
    // the dashboard). Editors see every published article.
    if (req.user.role === "writer") {
      const sections = await Section.find({
        writers: req.user._id,
        archived: false,
      }).select("_id");

      query.section = {
        $in: sections.map((section) => section._id),
      };
    }

    const articles = await Article.find(query)
      .populate("author", "name email")
      .populate("publishedBy", "name email")
      .sort({ publishedAt: -1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error(
      "Get published articles error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while fetching published articles",
    });
  }
};


const createRevision = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    const isAuthor =
      article.author.toString() === req.user._id.toString();

    if (!isAuthor) {
      return res.status(403).json({
        message: "Only the article author can create a revision",
      });
    }

    if (article.status !== "PUBLISHED") {
      return res.status(400).json({
        message:
          "A new revision can only be opened for a published article",
      });
    }

    const existingRevision = await ArticleRevision.findOne({
      article: article._id,
      status: {
        $in: ["DRAFT", "SUBMITTED", "APPROVED", "SCHEDULED"],
      },
    });

    if (existingRevision) {
      return res.status(400).json({
        message:
          "An active revision already exists for this article",
        revision: existingRevision,
      });
    }

    const revision = await ArticleRevision.create({
      article: article._id,
      title: article.title,
      content: article.content,
      section: article.section,
      author: article.author,
      status: "DRAFT",
    });

    await createHistory({
  article: article._id,
  type: "REVISION_CREATED",
  actor: req.user._id,
  revision: revision._id,
  newStatus: "DRAFT",
  });

    const populatedRevision = await ArticleRevision.findById(
      revision._id
    )
      .populate("article", "title status")
      .populate("author", "name email role")
      .populate("section", "name");

    return res.status(201).json({
      message: "New revision created successfully",
      revision: populatedRevision,
    });
  } catch (error) {
    next(error);
  }
};


//update revision
const updateRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;
    const { title, content, section } = req.body;

    const revision = await ArticleRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    const isAuthor =
      revision.author.toString() === req.user._id.toString();

    if (!isAuthor) {
      return res.status(403).json({
        message: "Only the revision author can edit this revision",
      });
    }

    // Only Draft revisions can be edited
    if (revision.status !== "DRAFT") {
      return res.status(400).json({
        message: `Revision cannot be edited while it is ${revision.status}`,
      });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          message: "Title cannot be empty",
        });
      }

      revision.title = title.trim();
    }

    if (content !== undefined) {
      revision.content = content;
    }

    if (section !== undefined) {
      const selectedSection = await Section.findById(section);

      if (!selectedSection) {
        return res.status(404).json({
          message: "Section not found",
        });
      }

      if (selectedSection.archived) {
        return res.status(400).json({
          message: "Cannot move revision to an archived section",
        });
      }

      const isAssigned = selectedSection.writers.some(
        (writerId) =>
          writerId.toString() === req.user._id.toString()
      );

      if (!isAssigned) {
        return res.status(403).json({
          message: "You are not assigned to this section",
        });
      }

      revision.section = selectedSection._id;
    }

    await revision.save();

    const updatedRevision = await ArticleRevision.findById(
      revision._id
    )
      .populate("article", "title status")
      .populate("author", "name email role")
      .populate("section", "name");

    return res.status(200).json({
      message: "Revision updated successfully",
      revision: updatedRevision,
    });
  } catch (error) {
    next(error);
  }
};

//submit revision
const submitRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    const revision = await ArticleRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    if (revision.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the revision author can submit it",
      });
    }

    if (revision.status !== "DRAFT") {
      return res.status(400).json({
        message: `Revision cannot be submitted from ${revision.status}`,
      });
    }

    const oldStatus = revision.status;

   revision.status = "SUBMITTED";
   await revision.save();

    await createHistory({
    article: revision.article,
    type: "REVISION_STATUS_CHANGE",
    actor: req.user._id,
    oldStatus,
    newStatus: "SUBMITTED",
    revision: revision._id,
    });

    return res.status(200).json({
      message: "Revision submitted for review",
      revision,
    });
  } catch (error) {
    next(error);
  }
};

//approve revision
const approveRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    const revision = await ArticleRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can approve revisions",
      });
    }

    // Author cannot approve their own revision
    if (revision.author.toString() === req.user._id.toString()) {
      return res.status(403).json({
        message: "An editor cannot approve their own revision",
      });
    }

    if (revision.status !== "SUBMITTED") {
      return res.status(400).json({
        message: `Only a revision in IN REVIEW can be approved. Current status: ${revision.status}`,
      });
    }

    const oldStatus = revision.status;

     revision.status = "APPROVED";
     await revision.save();

    await createHistory({
    article: revision.article,
    type: "REVISION_STATUS_CHANGE",
    actor: req.user._id,
    oldStatus,
    newStatus: "APPROVED",
     revision: revision._id,
    });

    return res.status(200).json({
      message: "Revision approved successfully",
      revision,
    });
  } catch (error) {
    next(error);
  }
};

//scehdule revision
const scheduleRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;
    const { publishAt } = req.body;

    if (!publishAt) {
      return res.status(400).json({
        message: "Future publish time is required",
      });
    }

    const publishDate = new Date(publishAt);

    if (
      Number.isNaN(publishDate.getTime()) ||
      publishDate <= new Date()
    ) {
      return res.status(400).json({
        message: "Scheduled publish time must be in the future",
      });
    }

    const revision = await ArticleRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can schedule revisions",
      });
    }

    if (revision.status !== "APPROVED") {
      return res.status(400).json({
        message: `Only an APPROVED revision can be scheduled. Current status: ${revision.status}`,
      });
    }

    const oldStatus = revision.status;

   revision.status = "SCHEDULED";
   revision.publishAt = publishDate;

    await revision.save();

    await createHistory({
    article: revision.article,
    type: "REVISION_STATUS_CHANGE",
    actor: req.user._id,
     oldStatus,
    newStatus: "SCHEDULED",
    revision: revision._id,
    });

    return res.status(200).json({
      message: "Revision scheduled successfully",
      revision,
    });
  } catch (error) {
    next(error);
  }
};

//publish revision
const publishRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    const revision = await ArticleRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        message: "Revision not found",
      });
    }

    if (req.user.role !== "editor") {
      return res.status(403).json({
        message: "Only editors can publish revisions",
      });
    }

    if (
      revision.status !== "APPROVED" &&
      revision.status !== "SCHEDULED"
    ) {
      return res.status(400).json({
        message:
          "Only an APPROVED or SCHEDULED revision can be published",
      });
    }

    const article = await Article.findById(revision.article);

    if (!article) {
      return res.status(404).json({
        message: "Original article not found",
      });
    }

    // Replace original article content only now
    article.title = revision.title;
    article.content = revision.content;
    article.section = revision.section;

    const now = new Date();
    const oldArticleStatus = article.status;


   article.status = "PUBLISHED";
   article.publishedAt = now;
   article.publishedBy = req.user._id;

// Clear old scheduling data
   article.scheduledAt = null;
   article.scheduledBy = null;

// Clear old overdue alert data
   article.overdueAlertDismissed = false;
   article.overdueAlertDismissedAt = null;
    article.overdueAlertDismissedBy = null;

    await article.save();

    await createHistory({
  article: article._id,
  type: "STATUS_CHANGE",
  actor: req.user._id,
  oldStatus: oldArticleStatus,
  newStatus: "PUBLISHED",
  revision: revision._id,
});

    // Mark revision as published
    const oldRevisionStatus = revision.status;

   revision.status = "PUBLISHED";
   revision.published = true;
   revision.publishedAt = now;

   await revision.save();

   await createHistory({
   article: article._id,
   type: "REVISION_STATUS_CHANGE",
   actor: req.user._id,
   oldStatus: oldRevisionStatus,
   newStatus: "PUBLISHED",
   revision: revision._id,
   });

    return res.status(200).json({
      message: "Revision published and article updated successfully",
      article,
      revision,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// GET OVERDUE PUBLISH ALERTS
// GET /api/articles/alerts/overdue
// Editor only
// ==========================================
const getOverdueAlerts = async (req, res, next) => {
  try {
    if (req.user.role !== "editor") {
      return res.status(403).json({
        success: false,
        message: "Only editors can view overdue alerts",
      });
    }

    const now = new Date();

    const articles = await Article.find({
      status: "SCHEDULED",
      scheduledAt: { $lt: now },
      overdueAlertDismissed: { $ne: true }
    })
      .populate("author", "name email")
      .populate("section", "name")
      .sort({ scheduledAt: 1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      alerts: articles,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DISMISS OVERDUE ALERT
// PATCH /api/articles/alerts/overdue/:id/dismiss
// Editor only
// ==========================================
const dismissOverdueAlert = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "editor") {
      return res.status(403).json({
        success: false,
        message: "Only editors can dismiss overdue alerts",
      });
    }

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    const now = new Date();

    const isOverdue =
      article.status === "SCHEDULED" &&
      article.scheduledAt &&
      article.scheduledAt < now;

    if (!isOverdue) {
      return res.status(400).json({
        success: false,
        message: "This article is not currently overdue",
      });
    }

    article.overdueAlertDismissed = true;
    article.overdueAlertDismissedAt = now;
    article.overdueAlertDismissedBy = req.user._id;

    await article.save();

    return res.status(200).json({
      success: true,
      message: "Overdue alert dismissed successfully",
      article,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// GET OVERDUE ALERT COUNT
// GET /api/articles/alerts/overdue/count
// Editor only
// ==========================================
const getOverdueAlertCount = async (req, res, next) => {
  try {
    if (req.user.role !== "editor") {
      return res.status(403).json({
        success: false,
        message: "Only editors can view overdue alert count",
      });
    }

    const now = new Date();

    const count = await Article.countDocuments({
      status: "SCHEDULED",
      scheduledAt: { $lt: now },
      overdueAlertDismissed: { $ne: true }
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};


// BULK SCHEDULE
const bulkScheduleArticles = async (req, res, next) => {
  try {
    const { articleIds, publishAt } = req.body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one article must be selected",
      });
    }

    if (!publishAt) {
      return res.status(400).json({
        success: false,
        message: "Future publish time is required",
      });
    }

    const publishDate = new Date(publishAt);

    if (
      Number.isNaN(publishDate.getTime()) ||
      publishDate <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Scheduled publish time must be in the future",
      });
    }

    const results = [];

    for (const articleId of articleIds) {
      try {
        const article = await Article.findById(articleId);

        if (!article) {
          results.push({
            articleId,
            success: false,
            message: "Article not found",
          });
          continue;
        }

        if (article.status !== "APPROVED") {
          results.push({
            articleId,
            success: false,
            message: `Cannot schedule article. Current status: ${article.status}`,
          });
          continue;
        }

        article.status = "SCHEDULED";
        article.scheduledAt = publishDate;
        article.scheduledBy = req.user._id;

        article.overdueAlertDismissed = false;
        article.overdueAlertDismissedAt = null;
        article.overdueAlertDismissedBy = null;

        await article.save();

        results.push({
          articleId,
          success: true,
          message: "Article scheduled successfully",
        });
      } catch (error) {
        results.push({
          articleId,
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk scheduling completed",
      results,
    });
  } catch (error) {
    next(error);
  }
};


// BULK UNPUBLISH
const bulkUnpublishArticles = async (req, res, next) => {
  try {
    const { articleIds } = req.body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one article must be selected",
      });
    }

    const results = [];

    for (const articleId of articleIds) {
      try {
        const article = await Article.findById(articleId);

        if (!article) {
          results.push({
            articleId,
            success: false,
            message: "Article not found",
          });
          continue;
        }

        if (
          article.status !== "PUBLISHED" &&
          article.status !== "SCHEDULED"
        ) {
          results.push({
            articleId,
            success: false,
            message:
              `Cannot unpublish article. Current status: ${article.status}`,
          });
          continue;
        }

        article.status = "APPROVED";
        article.scheduledAt = null;
        article.scheduledBy = null;

        article.overdueAlertDismissed = false;
        article.overdueAlertDismissedAt = null;
        article.overdueAlertDismissedBy = null;

        await article.save();

        results.push({
          articleId,
          success: true,
          message: "Article unpublished successfully",
        });
      } catch (error) {
        results.push({
          articleId,
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk unpublish completed",
      results,
    });
  } catch (error) {
    next(error);
  }
};


// EXPORT EDITORIAL CALENDAR
const exportEditorialCalendar = async (req, res, next) => {
  try {
    const articles = await Article.find({
      status: {
        $in: ["SCHEDULED", "PUBLISHED"],
      },
    })
      .populate("section", "name")
      .populate("author", "name email")
      .sort({ scheduledAt: 1, publishedAt: 1 });

    const escapeCsv = (value) => {
      if (value === null || value === undefined) {
        return "";
      }

      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const rows = [
      [
        "Article",
        "Section",
        "Author",
        "Status",
        "Publish Time",
      ],
    ];

    articles.forEach((article) => {
      const publishTime =
        article.status === "PUBLISHED"
          ? article.publishedAt
          : article.scheduledAt;

      rows.push([
        article.title,
        article.section?.name || "",
        article.author?.name ||
          article.author?.email ||
          "",
        article.status,
        publishTime
          ? new Date(publishTime).toISOString()
          : "",
      ]);
    });

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="editorial-calendar.csv"'
    );

    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

const getArticleHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Writer can only see history of articles
    // belonging to their assigned sections
    if (req.user.role === "writer") {
      const section = await Section.findOne({
        _id: article.section,
        writers: req.user._id,
        archived: false,
      });

      if (!section) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this article history",
        });
      }
    }

    const history = await ArticleHistory.find({
      article: article._id,
    })
      .populate("actor", "name email role")
      .populate("revision", "title status published publishedAt createdAt")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
};

const addArticleComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Writer can comment only on articles in their assigned section
    if (req.user.role === "writer") {
      const section = await Section.findById(article.section);

      if (
        !section ||
        !section.writers.some(
          (writerId) =>
            writerId.toString() === req.user._id.toString()
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this section",
        });
      }
    }

    await createHistory({
      article: article._id,
      type: "COMMENT",
      actor: req.user._id,
      comment: comment.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Add article comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

const getScheduledArticles = async (req, res, next) => {
  try {
    const articles = await Article.find({
      status: "SCHEDULED",
    })
      .populate("author", "name email")
      .populate("section", "name")
      .populate("scheduledBy", "name email")
      .sort({ scheduledAt: 1 });

    return res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error("Get scheduled articles error:", error);
    next(error);
  }
};



module.exports = {
  createArticle,
  

  getPublishedArticles,

  getMyArticles,
  getArticles,
  getArticle,
  updateArticle,
  submitArticle,
  getReviewArticles,
  getApprovedArticles,
  requestChanges,
  approveArticle,
  scheduleArticle,
  publishArticle,
  unpublishArticle,
  createRevision,
  updateRevision,
  submitRevision,
  approveRevision,
  scheduleRevision,
  publishRevision,
  getOverdueAlerts,
  dismissOverdueAlert,
  getOverdueAlertCount,
  bulkScheduleArticles,
  bulkUnpublishArticles,
  exportEditorialCalendar,
  getArticleHistory,
  addArticleComment,
  getScheduledArticles,

 
};