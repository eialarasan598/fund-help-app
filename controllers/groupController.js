const Group = require('../models/Group');
const mongoose = require('mongoose');

// Create a group
exports.createGroup = async (req, res) => {
  try {
    const { name, members = [], monthlyContribution = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (monthlyContribution < 0) return res.status(400).json({ message: 'monthlyContribution must be positive' });
    if (members.length > Group.MAX_MEMBERS) return res.status(400).json({ message: `Max members is ${Group.MAX_MEMBERS}` });

    const adminId = req.user._id;
    // ensure admin is in members
    if (!members.find(m => m.toString() === adminId.toString())) members.push(adminId);

    const group = await Group.create({ name, adminId, members, monthlyContribution });
    return res.status(201).json(group);
  } catch (err) {
    console.error('createGroup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get a single group (populate members/admin)
exports.getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const group = await Group.findById(id).populate('adminId', '-password').populate('members', '-password').lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });
    return res.json(group);
  } catch (err) {
    console.error('getGroup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update group (only admin allowed)
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can update group' });

    if (updates.monthlyContribution !== undefined && updates.monthlyContribution < 0) return res.status(400).json({ message: 'monthlyContribution must be positive' });
    if (updates.members && updates.members.length > Group.MAX_MEMBERS) return res.status(400).json({ message: `Max members is ${Group.MAX_MEMBERS}` });

    Object.assign(group, updates);
    await group.save();
    return res.json(group);
  } catch (err) {
    console.error('updateGroup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete group (admin only)
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can delete group' });
    await group.remove();
    return res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('deleteGroup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add member (admin only)
exports.addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!mongoose.isValidObjectId(memberId)) return res.status(400).json({ message: 'Invalid memberId' });
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can add members' });
    if (group.members.find(m => m.toString() === memberId)) return res.status(400).json({ message: 'Member already exists' });
    if (group.members.length + 1 > Group.MAX_MEMBERS) return res.status(400).json({ message: `Max members is ${Group.MAX_MEMBERS}` });
    group.members.push(memberId);
    await group.save();
    return res.json(group);
  } catch (err) {
    console.error('addMember error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Contribute to group (any member)
exports.contribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    // Optionally ensure the user is a member
    const userId = req.user._id;
    if (!group.members.find(m => m.toString() === userId.toString())) return res.status(403).json({ message: 'Only members can contribute' });
    await group.addContribution(userId, amount);
    return res.json(group);
  } catch (err) {
    console.error('contribute error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List groups for current user
exports.listGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId }).populate('adminId', '-password').lean();
    return res.json(groups);
  } catch (err) {
    console.error('listGroups error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
