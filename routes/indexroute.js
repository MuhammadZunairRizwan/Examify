const nodemailer = require('nodemailer');
require("dotenv").config()
const express = require('express');
const path = require('path');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Admin, Student, Teacher,Quiz} = require('../models/User');
const { stringify } = require('querystring');

// Dummy database to store user data and verification codes
let users = {};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: "examify81@gmail.com",
    pass: "",//pass key of gmail 
  },
});






// Route for the studentdashboard
// router.get('/StudentDashboard', (req, res) => {
//     res.sendFile(path.join(__dirname, '../views/StudentDashboard.html'));
// });
// Route for the adddashboard
router.get("/AdminDashboard", (req, res)=>{
    return res.render("AdminDashboard");
});
router.get("/TeacherDashboard", (req, res)=>{
    return res.render("TeacherDashboard");
});
router.get("/StudentDashboard", (req, res)=>{

    
const username = req.session.username;
res.render('StudentDashboard', { username });
});


router.get("/editprofile", (req, res)=>{

    
    const username = req.session.username;
    res.render('editprofile', { username });
    });

// Route for the homepage
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/LandingPage.html'));
});
// Route for the signup
// GET request to render the signup form
router.get('/signup', (req, res) => {
    res.render('signup')
});

// POST request to handle form submission and create user


// Route for handling signup form submission
router.post('/signup', async (req, res) => {

    
  var { fullname, username, email, password, birthdate, user } = req.body;
  var hashedPassword = await bcrypt.hash(password, 10); 
  // Save email to session
  req.session.email = email;


  try {
    let userModel;
    switch (user) {
        case 'admin':
            userModel = Admin;
            break;
        case 'student':
            userModel = Student;
            break;
        case 'teacher':
            userModel = Teacher;
            break;
        default:
            return res.status(400).json({ message: 'Invalid user type' });
    }
    password=hashedPassword
    const newUser = new userModel({
        fullname,
        username,
        email,
        password,
        birthdate,
        userType: user // Include the userType field here
    });
    await newUser.save();



    // Generate verification code (a 4-digit random number)
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    // Store user data and verification code
    users[email] = { fullname, username, email, password, birthdate, userType: user, verificationCode };

    // Send verification email
    const mailOptions = {
      from: 'examify81@gmail.com',
      to: email,
      subject: 'Examify Email Verification',
      text: `Your verification code is: ${verificationCode}\n\n\n\nRegards:\nMuhammad Uzair Rizwan\nMuhammad Zunair Rizwan`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error sending verification email');
      } else {
        console.log('Verification email sent: ' + info.response);
        res.redirect('/verify_email');
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for the login
router.get('/login', (req, res) => {
    res.render('login')
});

router.post('/login', async (req, res) => {
    var { username, password } = req.body;
    req.session.username = username;
    let userType = null;

    try {
        // Find the user by username
        const admin = await Admin.findOne({ username });
        const student = await Student.findOne({ username });
        const teacher = await Teacher.findOne({ username });

        // Check if the user exists and if the password matches
        if (admin && await bcrypt.compare(password, admin.password)) {
            userType = 'admin';
        } else if (student && await bcrypt.compare(password, student.password)) {
            userType = 'student';
        } else if (teacher && await bcrypt.compare(password, teacher.password)) {
            userType = 'teacher';
        }

        // If user exists in any type, redirect to respective dashboard
        if (userType) {
            // Redirect based on userType
            switch (userType) {
                case 'admin':
                    res.redirect('/AdminDashboard');
                    break;
                case 'student':
                    res.redirect('/StudentDashboard');
                    break;
                case 'teacher':
                    res.redirect('/TeacherDashboard');
                    break;
                default:
                    res.status(403).json({ message: 'Unauthorized user type' });
            }
        } else {
            res.status(401).json({ message: 'Incorrect username or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Internal server error'});
    }
});

// Route for the ForgotPasswordPage
router.get('/ForgotPassword', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/ForgotPasswordPage.html'));
});
// Route for the verify_email
router.get('/verify_email', (req, res) => {
    // Retrieve email from session
    const userEmail = req.session.email;
    res.render('verify_email', { userEmail });
});
router.post('/verify_email', (req, res) => {
    const { email, verificationCode } = req.body;

    // Check if verification code matches the one stored during signup
    if (users[email] && users[email].verificationCode === parseInt(verificationCode)) {
        // Mark email as verified
        users[email].verified = true;
        res.status(200).send('Verification successful'); // Send success response
    } else {
        res.status(400).send('Invalid verification code');
    }
});





// Route for the Quiz
router.get('/Quiz', (req, res) => {
    const username = req.session.username;
    res.render('Quiz', { username });
});

// Route for the addtest
router.get('/addtest', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/addtest.html'));
});
// Route for the AddQuiz
// router.get('/AddQuiz', (req, res) => {
//     res.sendFile(path.join(__dirname, '../views/AddQuiz.html'));
// });

router.post('/addtest', async (req, res) => {
    try {
        const { questionText, optionA, optionB, optionC, optionD, correctOption } = req.body;

        // Iterate through the arrays and save each question
        for (let i = 0; i < questionText.length; i++) {
            const quiz = new Quiz({
                questionText: questionText[i],
                optionA: optionA[i],
                optionB: optionB[i],
                optionC: optionC[i],
                optionD: optionD[i],
                correctOption: correctOption[i]
            });
            await quiz.save();
        }

        res.send('Quiz questions saved successfully!');
    } catch (error) {
        console.error('Error saving quiz questions:', error);
        res.status(500).send('Error saving quiz questions');
    }
});

router.get('/Quiz', async (req, res) => {
    try {
        // Fetch 10 random questions from the database
        const questions = await Quiz.aggregate([{ $sample: { size: 10 } }]);
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});

// router.post('/addQuiz', async (req, res) => {
//     try {
//         const questions = [];
//         for (let i = 1; i <= 10; i++) {
//             const { [question${i}]: questionText, [q${i}a]: optionA, [q${i}b]: optionB, [q${i}c]: optionC, [q${i}d]: optionD, [correctOption${i}]: correctOption } = req.body;
//             questions.push({
//                 questionText,
//                 options: {
//                     optionA,
//                     optionB,
//                     optionC,
//                     optionD
//                 },
//                 correctOption
//             });
//         }
//         await Quiz.insertMany(questions);
//         console.log('Quiz questions saved successfully:', questions);
//         res.send('Quiz questions saved successfully!');
//     } catch (error) {
//         console.error('Error saving quiz questions:', error);
//         res.status(500).send('Error saving quiz questions');
//     }
// });


router.get('/CRUDstd', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/CRUDstd.html'));
});

router.get('/CRUDteacher', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/CRUDteacher.html'));
});


//CRUD OPERATIONS FOR STUDENT 
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find({});
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching students');
    }
});

// Route to handle fetching a student by username
router.get('/students/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const student = await Student.findOne({ username });
        if (!student) {
            res.status(404).send('Student not found');
            return;
        }
        res.json(student);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching student');
    }
});

// Route to handle updating a student
router.put('/students/:username', async (req, res) => {
    try {
        var { fullname, email, password, birthdate } = req.body;
        var hashedPassword = await bcrypt.hash(password, 10); 
        password=hashedPassword;
        const currentStudent = await Student.findOne({ username: req.params.username });

        // Construct the updated student object
        const updatedStudent = {
            fullname: fullname || currentStudent.fullname,
            email: email || currentStudent.email,
            password: password || currentStudent.password,
            birthdate: birthdate ? new Date(birthdate) : currentStudent.birthdate,
        };

        await Student.findOneAndUpdate({ username: req.params.username }, updatedStudent);
        res.status(200).send('Student updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating student');
    }
});

// Route to handle creating a student
router.post('/students', async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        var { fullname, username, email, password, birthdate } = req.body;
        var hashedPassword = await bcrypt.hash(password, 10); 
        password=hashedPassword;
        const student = new Student({ fullname, username, email, password, birthdate });
        await student.save();
        console.log('Student created successfully');
        res.status(201).send('Student created successfully');
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).send('Error creating student');
    }
});

// Route to handle deleting a student
router.delete('/students/:username', async (req, res) => {
    try {
        await Student.findOneAndDelete({ username: req.params.username });
        res.status(200).send('Student deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting student');
    }
});
//--------------------------------------------------------

// CRUD operations for teachers

// Route to fetch all teachers
router.get('/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({});
        res.json(teachers);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching teachers');
    }
});

// Route to fetch a teacher by username
router.get('/teachers/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const teacher = await Teacher.findOne({ username });
        if (!teacher) {
            res.status(404).send('Teacher not found');
            return;
        }
        res.json(teacher);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching teacher');
    }
});

// Route to update a teacher
router.put('/teachers/:username', async (req, res) => {
    try {
        var { fullname, email, password, birthdate } = req.body;
        var hashedPassword = await bcrypt.hash(password, 10); 
        password=hashedPassword;
        const currentTeacher = await Teacher.findOne({ username: req.params.username });

        // Construct the updated teacher object
        const updatedTeacher = {
            fullname: fullname || currentTeacher.fullname,
            email: email || currentTeacher.email,
            password: password || currentTeacher.password,
            birthdate: birthdate ? new Date(birthdate) : currentTeacher.birthdate,
        };

        await Teacher.findOneAndUpdate({ username: req.params.username }, updatedTeacher);
        res.status(200).send('Teacher updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating teacher');
    }
});

// Route to create a teacher
router.post('/teachers', async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        var { fullname, username, email, password, birthdate } = req.body;
        var hashedPassword = await bcrypt.hash(password, 10); 
        password=hashedPassword;
        const teacher = new Teacher({ fullname, username, email, password, birthdate });
        await teacher.save();
        console.log('Teacher created successfully');
        res.status(201).send('Teacher created successfully');
    } catch (error) {
        console.error('Error creating teacher:', error);
        res.status(500).send('Error creating teacher');
    }
});

// Route to delete a teacher
router.delete('/teachers/:username', async (req, res) => {
    try {
        await Teacher.findOneAndDelete({ username: req.params.username });
        res.status(200).send('Teacher deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting teacher');
    }
});


router.get('/quizzes', async (req, res) => {
    try {
        // Retrieve all quiz questions from the database
        const quizQuestions = await Quiz.find({}, 'questionText optionA optionB optionC optionD').limit(10);

        // Send the quiz questions as response
        res.json(quizQuestions);
    } catch (error) {
        console.error('Error fetching quiz questions:', error);
        res.status(500).send('Error fetching quiz questions');
    }
});


router.get('/quizzes/:id', async (req, res) => {
    try {
        const questionId = req.params.id;
        // Retrieve the question from the database by its ID
        const quizQuestion = await Quiz.findById(questionId);

        // Send the correct option for the question as response
        res.json({ correctOption: quizQuestion.correctOption });
    } catch (error) {
        console.error('Error fetching quiz question:', error);
        res.status(500).send('Error fetching quiz question');
    }
});



module.exports = router;