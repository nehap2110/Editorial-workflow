const express = require("express");

const {
  createArticle,
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
  getPublishedArticles,
  unpublishArticle,
  createRevision,
  getRevision,
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
  getScheduledArticles
} = require("../controllers/article.controller");

const {
  publishArticle,
} = require("../controllers/article.controller");

const protect = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();

// Create article — Writer only
router.post(
  "/",
  protect,
  requireRole("writer","editor"),
  createArticle
);

// ==========================================
// FIND ARTICLES
// GET /api/articles
// Editor → all visible articles
// Writer → own articles
// ==========================================

router.get(
  "/",
  protect,
  getArticles
);

// Get current writer's articles — Writer only
router.get(
  "/my",
  protect,
  requireRole("writer"),
  getMyArticles
);



// ==========================================
// GET ARTICLES FOR EDITOR REVIEW
// GET /api/articles/review
// Editor only
// ==========================================
router.get(
  "/review",
  protect,
  requireRole("editor"),
  getReviewArticles
);

// ==========================================
// GET APPROVED ARTICLES
// GET /api/articles/approved
// Editor only
// ==========================================

router.get(
  "/approved",
  protect,
  requireRole("editor"),
  getApprovedArticles
);

router.get(
  "/published",
  protect,
    requireRole("editor", "writer"),
  getPublishedArticles
);

router.get(
  "/scheduled",
  protect,
  requireRole("editor"),
  getScheduledArticles
);

// ==========================================
// BULK ACTIONS
// ==========================================

// Bulk schedule
router.post(
  "/bulk/schedule",
  protect,
  requireRole("editor"),
  bulkScheduleArticles
);

// Bulk unpublish
router.patch(
  "/bulk/unpublish",
  protect,
  requireRole("editor"),
  bulkUnpublishArticles
);

// Editorial calendar CSV
router.get(
  "/calendar/export",
  protect,
  requireRole("editor"),
  exportEditorialCalendar
);




// Get single revision — its author, or any editor
router.get(
  "/revisions/:revisionId",
  protect,
  requireRole("writer", "editor"),
  getRevision
);

//update revision
router.patch(
  "/revisions/:revisionId",
  protect,
  requireRole("writer"),
  updateRevision
);

// Submit revision
router.patch(
  "/revisions/:revisionId/submit",
  protect,
  requireRole("writer"),
  submitRevision
);

// Approve revision
router.patch(
  "/revisions/:revisionId/approve",
  protect,
  requireRole("editor"),
  approveRevision
);

// Schedule revision
router.patch(
  "/revisions/:revisionId/schedule",
  protect,
  requireRole("editor"),
  scheduleRevision
);

// Publish revision
router.patch(
  "/revisions/:revisionId/publish",
  protect,
  requireRole("editor"),
  publishRevision
);

// Overdue alerts
router.get(
  "/alerts/overdue",
  protect,
  requireRole("editor"),
  getOverdueAlerts
);

router.get(
  "/alerts/overdue/count",
  protect,
  requireRole("editor"),
  getOverdueAlertCount
);

// Dismiss overdue alert
router.patch(
  "/alerts/overdue/:id/dismiss",
  protect,
  requireRole("editor"),
  dismissOverdueAlert
);

router.post(
  "/:id/comments",
  protect,
  requireRole("editor", "writer"),
  addArticleComment
);

router.get(
  "/:id/history",
  protect,
  getArticleHistory
);

//schedule article
router.post(
  "/:id/schedule",
  protect,
  requireRole("editor"),
  scheduleArticle
);

// Request changes
router.post(
  "/:id/request-changes",
  protect,
  requireRole("editor"),
  requestChanges
);

// Approve
router.post(
  "/:id/approve",
  protect,
  requireRole("editor"),
  approveArticle
);

router.post(
  "/:id/publish",
  protect,
  requireRole("editor"),
  publishArticle
);

// Get single article — Any authenticated user
router.get(
  "/:id",
  protect,
  getArticle
);

// Update article — Writer only
router.patch(
  "/:id",
  protect,
  requireRole("editor", "writer"),
  updateArticle
);

// ==========================================
// SUBMIT ARTICLE FOR REVIEW
// POST /api/articles/:id/submit
// Writer only
// ==========================================
router.post(
  "/:id/submit",
  protect,
  requireRole("writer"),
  submitArticle
);

// Editor unpublishes scheduled/published article
router.patch(
  "/:id/unpublish",
  protect,
  requireRole("editor"),
  unpublishArticle
);

// Create a new revision for an existing article
router.post(
  "/:id/revision",
  protect,
  requireRole("writer"),
  createRevision
);



module.exports = router;