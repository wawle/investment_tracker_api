import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/users';
import advancedResults from '../middleware/advancedResults';
import User from '../models/User';

const router = express.Router({ mergeParams: true });

// Get all users and create user
router
  .route('/')
  .get(advancedResults(User as any), getUsers)
  .post(createUser);

// Get single user, update user, delete user
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

export default router;
