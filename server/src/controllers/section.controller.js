const mongoose = require("mongoose");
const Section = require("../models/Section");
const User = require("../models/User");

// Create section
const createSection = async (req, res, next) => {
  try {
    const { name, description, owner } = req.body;

    if (!name || !description || !owner) {
      return res.status(400).json({
        message: "Name, description and owner are required",
      });
    }

    // name/description are trimmed below, so they must be text
    if (typeof name !== "string" || typeof description !== "string") {
      return res.status(400).json({
        message: "Name and description must be text",
      });
    }

    // Owner must be a valid user
    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({
        message: "Invalid owner ID",
      });
    }

    const ownerUser = await User.findById(owner);

    if (!ownerUser) {
      return res.status(404).json({
        message: "Owner not found",
      });
    }

    if (ownerUser.role !== "editor") {
      return res.status(400).json({
        message: "Section owner must be an editor",
      });
    }

    const existingSection = await Section.findOne({
      name: name.trim(),
    });

    if (existingSection) {
      return res.status(409).json({
        message: "A section with this name already exists",
      });
    }

    const section = await Section.create({
      name: name.trim(),
      description: description.trim(),
      owner,
      writers: [],
    });

    const populatedSection = await Section.findById(section._id)
      .populate("owner", "name email role")
      .populate("writers", "name email role");

    return res.status(201).json({
      message: "Section created successfully",
      section: populatedSection,
    });
  } catch (error) {
    next(error);
  }
};

// Get sections
const getSections = async (req, res, next) => {
  try {
    const filter = {};

    // By default archived sections are hidden
    if (req.query.includeArchived !== "true") {
      filter.archived = false;
    }

    // Writers can only see sections assigned to them
    if (req.user.role === "writer") {
      filter.writers = req.user._id;
    }

    const sections = await Section.find(filter)
      .populate("owner", "name email role")
      .populate("writers", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: sections.length,
      sections,
    });
  } catch (error) {
    next(error);
  }
};

// Get one section
const getSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid section ID",
      });
    }

    const section = await Section.findById(id)
      .populate("owner", "name email role")
      .populate("writers", "name email role");

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    // Writers can only access their assigned sections
    if (
      req.user.role === "writer" &&
      !section.writers.some(
        (writer) => writer._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message: "You are not assigned to this section",
      });
    }

    return res.status(200).json({
      section,
    });
  } catch (error) {
    next(error);
  }
};

// Update section
const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, owner } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid section ID",
      });
    }

    // name/description are trimmed below, so when provided they must be text
    if (
      (name !== undefined && typeof name !== "string") ||
      (description !== undefined && typeof description !== "string")
    ) {
      return res.status(400).json({
        message: "Name and description must be text",
      });
    }

    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    if (name !== undefined) {
      const duplicate = await Section.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "A section with this name already exists",
        });
      }

      section.name = name.trim();
    }

    if (description !== undefined) {
      section.description = description.trim();
    }

    if (owner !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(owner)) {
        return res.status(400).json({
          message: "Invalid owner ID",
        });
      }

      const ownerUser = await User.findById(owner);

      if (!ownerUser) {
        return res.status(404).json({
          message: "Owner not found",
        });
      }

      if (ownerUser.role !== "editor") {
        return res.status(400).json({
          message: "Section owner must be an editor",
        });
      }

      section.owner = owner;
    }

    await section.save();

    const populatedSection = await Section.findById(section._id)
      .populate("owner", "name email role")
      .populate("writers", "name email role");

    return res.status(200).json({
      message: "Section updated successfully",
      section: populatedSection,
    });
  } catch (error) {
    next(error);
  }
};

// Archive section
const archiveSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid section ID",
      });
    }

    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    if (section.archived) {
      return res.status(400).json({
        message: "Section is already archived",
      });
    }

    section.archived = true;
    await section.save();

    return res.status(200).json({
      message: "Section archived successfully",
      section,
    });
  } catch (error) {
    next(error);
  }
};

// Restore section
const restoreSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid section ID",
      });
    }

    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    if (!section.archived) {
      return res.status(400).json({
        message: "Section is already active",
      });
    }

    section.archived = false;
    await section.save();

    return res.status(200).json({
      message: "Section restored successfully",
      section,
    });
  } catch (error) {
    next(error);
  }
};


// Assign writer to section
const assignWriter = async (req, res, next) => {
  try {
    const { id, writerId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(writerId)
    ) {
      return res.status(400).json({
        message: "Invalid section or writer ID",
      });
    }

    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    if (section.archived) {
      return res.status(400).json({
        message: "Cannot assign writer to an archived section",
      });
    }

    const writer = await User.findById(writerId);

    if (!writer) {
      return res.status(404).json({
        message: "Writer not found",
      });
    }

    if (writer.role !== "writer") {
      return res.status(400).json({
        message: "Only a writer can be assigned to a section",
      });
    }

    const alreadyAssigned = section.writers.some(
      (writer) => writer.toString() === writerId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        message: "Writer is already assigned to this section",
      });
    }

    section.writers.push(writerId);

    await section.save();

    const updatedSection = await Section.findById(id)
      .populate("owner", "name email role")
      .populate("writers", "name email role");

    return res.status(200).json({
      message: "Writer assigned successfully",
      section: updatedSection,
    });
  } catch (error) {
    next(error);
  }
};


// Remove writer from section
const removeWriter = async (req, res, next) => {
  try {
    const { id, writerId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(writerId)
    ) {
      return res.status(400).json({
        message: "Invalid section or writer ID",
      });
    }

    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    const writerAssigned = section.writers.some(
      (writer) => writer.toString() === writerId
    );

    if (!writerAssigned) {
      return res.status(400).json({
        message: "Writer is not assigned to this section",
      });
    }

    section.writers = section.writers.filter(
      (writer) => writer.toString() !== writerId
    );

    await section.save();

    const updatedSection = await Section.findById(id)
      .populate("owner", "name email role")
      .populate("writers", "name email role");

    return res.status(200).json({
      message: "Writer removed successfully",
      section: updatedSection,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSection,
  getSections,
  getSection,
  updateSection,
  archiveSection,
  restoreSection,
  assignWriter,
  removeWriter,
};