const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Helper to generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'campus_connect_fallback_secret',
    { expiresIn: '7d' }
  );
};

/**
 * @route   POST /api/auth/register (and /register)
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentId, department, year, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // If database is connected
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const assignedRole = (role && ['student', 'faculty', 'admin'].includes(role)) ? role : 'student';

      const newUser = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: assignedRole,
        studentId: studentId ? studentId.trim() : '',
        department: department || 'Computer Science & Engineering',
        year: year || '1st Year',
        phone: phone ? phone.trim() : '',
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`
      });

      const token = generateToken(newUser._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to Campus Connect.',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          studentId: newUser.studentId,
          department: newUser.department,
          year: newUser.year,
          phone: newUser.phone,
          profileImage: newUser.profileImage,
          bio: newUser.bio || '',
          skills: newUser.skills || [],
          github: newUser.github || '',
          linkedin: newUser.linkedin || ''
        }
      });
    } else {
      // Fallback offline session
      const fallbackId = new mongoose.Types.ObjectId();
      const token = generateToken(fallbackId);
      return res.status(201).json({
        success: true,
        message: 'Demo registration successful!',
        token,
        user: {
          id: fallbackId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: role || 'student',
          studentId: studentId || 'CS2026-DEMO',
          department: department || 'Computer Science & Engineering',
          year: year || '1st Year',
          phone: phone || '',
          profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
          bio: '',
          skills: [],
          github: '',
          linkedin: ''
        }
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
});

/**
 * @route   POST /api/auth/login (and /login)
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          department: user.department,
          year: user.year,
          phone: user.phone,
          profileImage: user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
          bio: user.bio || '',
          skills: user.skills || [],
          github: user.github || '',
          linkedin: user.linkedin || ''
        }
      });
    } else {
      // Offline fallback login for demo
      const fallbackId = new mongoose.Types.ObjectId();
      const token = generateToken(fallbackId);
      const isFaculty = email.includes('faculty');
      const isAdmin = email.includes('admin');
      const role = isAdmin ? 'admin' : (isFaculty ? 'faculty' : 'student');
      const name = isAdmin ? 'Demo Administrator' : (isFaculty ? 'Prof. Demo Faculty' : 'Demo Student');

      return res.status(200).json({
        success: true,
        message: 'Demo login successful!',
        token,
        user: {
          id: fallbackId,
          name,
          email,
          role,
          studentId: 'DEMO-101',
          department: 'Computer Science & Engineering',
          year: '3rd Year',
          phone: '+1 555 0192',
          profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          bio: 'Demo account for Campus Connect portal exploration.',
          skills: ['JavaScript', 'Web Development'],
          github: 'github.com',
          linkedin: 'linkedin.com'
        }
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
});

/**
 * @route   POST /api/auth/demo-login (and /demo-login)
 * @desc    One-Click Quick Demo Sign-In for Testing
 * @access  Public
 */
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body; // 'student', 'faculty', 'admin'
    const targetRole = ['student', 'faculty', 'admin'].includes(role) ? role : 'student';

    const demoProfiles = {
      student: {
        name: 'Alex Johnson (Student)',
        email: 'student.demo@college.edu',
        password: 'demoPassword123',
        role: 'student',
        studentId: 'CS2026-089',
        department: 'Computer Science & Engineering',
        year: '3rd Year',
        phone: '+1 (555) 018-4729',
        bio: 'Computer Science undergraduate passionate about Full-Stack web development and AI.',
        skills: ['JavaScript', 'Node.js', 'Python', 'React', 'MongoDB'],
        github: 'https://github.com/alex-johnson',
        linkedin: 'https://linkedin.com/in/alex-johnson',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexStudent&backgroundColor=ffd5dc,d1d4f9,c0aede,ffdfbf'
      },
      faculty: {
        name: 'Prof. David Miller (Faculty)',
        email: 'faculty.demo@college.edu',
        password: 'demoPassword123',
        role: 'faculty',
        studentId: 'FAC-104',
        department: 'Computer Science & Engineering',
        year: 'Faculty Member',
        phone: '+1 (555) 014-9283',
        bio: 'Associate Professor in Algorithms and Database Systems with 10+ years of teaching experience.',
        skills: ['Data Structures', 'Database Systems', 'Cloud Architecture'],
        github: 'https://github.com/prof-miller',
        linkedin: 'https://linkedin.com/in/prof-david-miller',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProfDavid&backgroundColor=ffdfbf,c0aede,d1d4f9'
      },
      admin: {
        name: 'Dr. Sarah Jenkins (Admin)',
        email: 'admin.demo@college.edu',
        password: 'demoPassword123',
        role: 'admin',
        studentId: 'ADM-001',
        department: 'Campus Administration',
        year: 'Dean of Student Affairs',
        phone: '+1 (555) 019-2831',
        bio: 'Chief Administrator overseeing campus notifications, student clubs, and academic events.',
        skills: ['Campus Operations', 'Academic Leadership', 'Student Grievance Redressal'],
        github: '',
        linkedin: 'https://linkedin.com/in/dr-sarah-jenkins',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DrSarah&backgroundColor=ffd5dc,ffdfbf,c0aede'
      }
    };

    const targetProfile = demoProfiles[targetRole];

    let userDoc;
    if (mongoose.connection.readyState === 1) {
      userDoc = await User.findOne({ email: targetProfile.email });
      if (!userDoc) {
        userDoc = await User.create(targetProfile);
      }
    } else {
      userDoc = {
        _id: new mongoose.Types.ObjectId(),
        ...targetProfile
      };
    }

    const token = generateToken(userDoc._id);

    return res.status(200).json({
      success: true,
      message: `1-Click Demo Login as ${targetRole.toUpperCase()} successful!`,
      token,
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        studentId: userDoc.studentId,
        department: userDoc.department,
        year: userDoc.year,
        phone: userDoc.phone,
        profileImage: userDoc.profileImage,
        bio: userDoc.bio || targetProfile.bio,
        skills: userDoc.skills || targetProfile.skills,
        github: userDoc.github || targetProfile.github,
        linkedin: userDoc.linkedin || targetProfile.linkedin
      }
    });
  } catch (error) {
    console.error('Demo Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform demo login.'
    });
  }
});

/**
 * @route   GET /api/auth/me (and /me)
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch user profile.'
    });
  }
});

/**
 * @route   PUT /api/auth/profile (and /profile)
 * @desc    Update user profile information, avatar, bio, skills, and links
 * @access  Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      year,
      profileImage,
      bio,
      skills,
      github,
      linkedin
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department) user.department = department.trim();
    if (year) user.year = year.trim();
    if (profileImage !== undefined) user.profileImage = profileImage.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (Array.isArray(skills)) user.skills = skills;
    if (github !== undefined) user.github = github.trim();
    if (linkedin !== undefined) user.linkedin = linkedin.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        phone: user.phone,
        profileImage: user.profileImage,
        bio: user.bio,
        skills: user.skills,
        github: user.github,
        linkedin: user.linkedin
      }
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new passwords.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.'
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Password Change Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.'
    });
  }
});

module.exports = router;
