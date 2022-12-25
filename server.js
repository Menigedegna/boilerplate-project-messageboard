'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');
const helmet = require('helmet');


const mongoose = require("mongoose");


mongoose.set('strictQuery', true);
const app = express();

// security configuration
// Do not allow DNS prefetching.
app.use(helmet.dnsPrefetchControl());
// Only allow your site to be loaded in an iFrame on your own pages.
app.use(helmet.frameguard({ action: 'sameorigin' }));
// Only allow your site to send the referrer for your own pages.
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"]
  }
}));

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//connect to db
mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true });

//create replies schema and model
let repliesSchema = new mongoose.Schema({
  _id: String,
  text: { type: String, required: true },
  created_on: Date,
  delete_password: {type: String},
  reported: {type: Boolean, default: false}
});
// let Replies = mongoose.model('Replies', repliesSchema);

//create thread schema and model with foregin key to Replies
let threadSchema = new mongoose.Schema({
  _id: String,
  text: { type: String, required: true },
  created_on: Date,
  bumped_on: Date,
  delete_password: {type: String},
  reported: {type: Boolean, default: false},
  replies: [repliesSchema],
  replycount: 0
});
let Thread = mongoose.model('Thread', threadSchema);

//create board schema and model with foreign key to Thread
let boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  _id: String,
  thread: [
    { type: String, ref: 'Thread' }
  ]
});
let Board = mongoose.model('Board', boardSchema);
// Thread.deleteMany({} , (err, threads) => {
//   if (err) return console.log(err);
// });
// Board.deleteMany({} , (err, boards) => {
//   if (err) return console.log(err);
// });

//Sample front-end
app.route('/b/:board/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app, Thread, Board);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

//Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function() {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function() {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app; //for testing
