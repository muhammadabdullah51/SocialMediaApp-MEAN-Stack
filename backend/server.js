const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

const corsOptions = {
  origin: "http://localhost:4200",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

mongoose
  .connect("mongodb://127.0.0.1:27017/postsapp")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, match: /\S+@\S+\.\S+/ },
  password: { type: String, required: true, minlength: 6 },
});
const User = mongoose.model("User", UserSchema);

const ReplySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});
const Reply = mongoose.model("Reply", ReplySchema);

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});
const Comment = mongoose.model("Comment", CommentSchema);

const LikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
const Like = mongoose.model("Like", LikeSchema);

const PostSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});
const Post = mongoose.model("Post", PostSchema);

const JWT_SECRET = "your_jwt_secret";

// In-memory token blacklist
let tokenBlacklist = [];

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('toggleLike', async (data) => {
    try {
      const post = await Post.findById(data.postId).populate('likes');
      const userIdIndex = post.likes.findIndex(like => like.user.toString() === data.userId);

      if (userIdIndex === -1) {
        // User hasn't liked the post yet, so like it
        const newLike = new Like({ user: data.userId });
        await newLike.save();
        post.likes.push(newLike);
      } else {
        // User has already liked the post, so unlike it
        const likeId = post.likes[userIdIndex]._id;
        post.likes.splice(userIdIndex, 1);
        await Like.findByIdAndDelete(likeId);
      }

      await post.save();
      const updatedPost = await Post.findById(data.postId).populate("user", "username email").populate({
        path: 'likes',
        populate: { path: 'user', select: 'username' }
      }).populate({
        path: 'comments',
        populate: [
          { path: 'user', select: 'username' },
          { path: 'replies', populate: { path: 'user', select: 'username' } }
        ]
      });
      io.emit('updatePost', updatedPost);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  });

  socket.on('commentPost', async (data) => {
    try {
      const post = await Post.findById(data.postId).populate('comments');
      const newComment = new Comment({ user: data.userId, text: data.comment });
      await newComment.save();
      post.comments.push(newComment);
      await post.save();
      const updatedPost = await Post.findById(data.postId).populate("user", "username email").populate({
        path: 'likes',
        populate: { path: 'user', select: 'username' }
      }).populate({
        path: 'comments',
        populate: [
          { path: 'user', select: 'username' },
          { path: 'replies', populate: { path: 'user', select: 'username' } }
        ]
      });
      io.emit('updatePost', updatedPost);
    } catch (err) {
      console.error('Error commenting on post:', err);
    }
  });

  socket.on('replyComment', async (data) => {
    try {
      const comment = await Comment.findById(data.commentId).populate('replies');
      const newReply = new Reply({ user: data.userId, text: data.reply });
      await newReply.save();
      comment.replies.push(newReply);
      await comment.save();
      const post = await Post.findById(data.postId).populate("user", "username email").populate({
        path: 'likes',
        populate: { path: 'user', select: 'username' }
      }).populate({
        path: 'comments',
        populate: [
          { path: 'user', select: 'username' },
          { path: 'replies', populate: { path: 'user', select: 'username' } }
        ]
      });
      io.emit('updatePost', post);
    } catch (err) {
      console.error('Error replying to comment:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.post(
  "/signup",
  [
    body("username").not().isEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Email is invalid"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user = new User({ username, email, password: hashedPassword });
      await user.save();

      res.status(201).json({ message: "Signup successful" });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email is invalid"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
      res.status(200).json({ token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Access denied" });

  // Check if token is blacklisted
  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ message: "Token has been invalidated" });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    res.status(400).json({ message: "Invalid token" });
  }
};

app.post(
  "/addpost",
  verifyToken,
  upload.single("image"),
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("description").not().isEmpty().withMessage("Description is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description } = req.body;
    try {
      const post = new Post({
        image: req.file.path, // Store the file path
        title,
        description,
        user: req.user.id,
      });
      await post.save();
      res.status(201).json({ post });
    } catch (err) {
      console.error("Add post error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().populate("user", "username email").populate({
      path: 'likes',
      populate: { path: 'user', select: 'username' }
    }).populate({
      path: 'comments',
      populate: [
        { path: 'user', select: 'username' },
        { path: 'replies', populate: { path: 'user', select: 'username' } }
      ]
    });
    res.status(200).json({ posts });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/user/posts", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id }).populate("user", "username email").populate({
      path: 'likes',
      populate: { path: 'user', select: 'username' }
    }).populate({
      path: 'comments',
      populate: [
        { path: 'user', select: 'username' },
        { path: 'replies', populate: { path: 'user', select: 'username' } }
      ]
    });
    res.status(200).json({ posts });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/post/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("user", "username email").populate({
      path: 'likes',
      populate: { path: 'user', select: 'username' }
    }).populate({
      path: 'comments',
      populate: [
        { path: 'user', select: 'username' },
        { path: 'replies', populate: { path: 'user', select: 'username' } }
      ]
    });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json({ post });
  } catch (err) {
    console.error("Get post by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put(
  "/post/:id",
  verifyToken,
  upload.single("image"),
  [
    body("title").optional().not().isEmpty().withMessage("Title is required"),
    body("description")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Description is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description } = req.body;
    try {
      const updateData = { title, description };
      if (req.file) {
        updateData.image = req.file.path; // Update the file path if new image is uploaded
      }
      const post = await Post.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.status(200).json({ post });
    } catch (err) {
      console.error("Update post error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.delete("/post/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/logout", verifyToken, (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  tokenBlacklist.push(token);
  res.status(200).json({ message: "Logout successful" });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
