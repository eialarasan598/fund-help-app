const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const groupCtrl = require('../controllers/groupController');

// All routes protected
router.use(auth);

// POST /api/groups - create group
router.post('/', groupCtrl.createGroup);

// GET /api/groups - list groups for user
router.get('/', groupCtrl.listGroups);

// GET /api/groups/:id - get group
router.get('/:id', groupCtrl.getGroup);

// PUT /api/groups/:id - update group (admin)
router.put('/:id', groupCtrl.updateGroup);

// DELETE /api/groups/:id - delete group (admin)
router.delete('/:id', groupCtrl.deleteGroup);

// POST /api/groups/:id/members - add member (admin)
router.post('/:id/members', groupCtrl.addMember);

// POST /api/groups/:id/contribute - contribute
router.post('/:id/contribute', groupCtrl.contribute);

module.exports = router;
