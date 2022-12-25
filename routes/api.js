'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = function(app, Thread, Board) {

  app.route('/api/threads/:board')
    //GET THREADS IN A BOARD
    .get(function(req, res) {
      Board.findOne({ title: req.params.board }, (err, board) => {
        if (err) return console.log(err);
        if (!board) res.send([]);
        if (board) {
          var threadIds = board.thread;
          Thread
            .find( { _id: { $in: threadIds } })
            .sort({'bumped_on': -1})
            .limit(10)
            // .slice("replies", 3)
            .select({"replies.reported": 0, "replies.delete_password": 0, delete_password:0, reported:0})
            .exec((err, threadFound)=>{
              if (err) return console.log(err);
              //if threads are found
              if (threadFound) {
                console.log(threadFound[0]);
                res.send(threadFound);
              } else {
                res.send([]);
              }
            });//end look for threads
        }//end if board is found
      });//end Board.findOne logic
    })

    //POST A THREAD IN A BOARD
    .post(function(req, res) {
      //if inputs are provided
      if(req.body.delete_password && req.body.text && (req.params.board || req.body.board)){
        var delete_password = req.body.delete_password;
        var text = req.body.text;
        var boardTitle = req.params.board || req.body.board
        //create a new thread
        const hash = bcrypt.hashSync(delete_password, 12);
        const threadId = uuidv4();
        var viewThread = {
          _id: threadId,
          text: text,
          created_on: new Date(),
          bumped_on: new Date(),
          delete_password: hash,
          reported: false,
          replies: [],
          replycount: 0
        };
        const newThread = new Thread(viewThread);
        newThread.save(function(err, thread) {
          if (err) return console.log(err);
          //save thread in board
          if (thread) {
            Board.findOne({ title: boardTitle }, (err, board) => {
              if (err) return console.log(err);
              //if board is not found in Board
              if (!board) {
                var newBoardOBJ = {
                  title: boardTitle,
                  _id: uuidv4(),
                  thread: [threadId]
                }
                //create a new board
                const newBoard = new Board(newBoardOBJ);
                newBoard.save(function(err, board) {
                  if (err) return console.log(err);
                  if (board) {
                    res.redirect(`/b/${boardTitle}/`);
                  }
                });//end save newBoard
              }
              // if board is found
              else{
                //add thread_Id to board.thread
                board.thread.push(threadId);
                board.save();
                res.redirect(`/b/${boardTitle}/`);
              }//end if boad is found
            });//end Board.findOne logic
          }//if thread is saved
        });//end thread.save()
      }//end if inputs are provided
      else{
        res.send("Required field(s) are missing");
      }
    })

    .put(function(req, res){
      //if input is provided
      if( req.body.thread_id){
        var thread_id = req.body.thread_id; 
        //find thread
        Thread.findById({_id: thread_id}, function (err, thread) {
          if (err) return console.log(err);   
          if (!thread) res.send("There is no thread by that _id in database");
          else{
            thread.reported = true;
            thread.save();
            res.send("reported");
          }
        });//end fidn thread_id in Thread logic     
      }//end if input is provided
      else res.send("Required field(s) are missing");
    })
    
    //DELETE A THREAD IN A BOARD
    .delete(function(req, res) {
      if( req.body.thread_id && (req.body.board || req.params.board) && req.body.delete_password){
        var boardTitle = req.body.board || req.params.board;
        const delete_password = req.body.delete_password;
        var thread_id = req.body.thread_id;
        //if board is found
        Board.findOne({ title: boardTitle }, (err, board) => {
          if (err) return console.log(err);   
          if (!board) res.send("Board is not found");
          else{
            //if thread id is not found
            if(board.thread.indexOf(thread_id) == -1 ){
              res.send("There is no thread by that _id in board");
            }else{
              //find thread
              Thread.findById({_id: thread_id}, function (err, thread) {
                if (err) return console.log(err);   
                if (!thread) res.send("There is no thread by that _id in database");
                else{
                  //if password is not correct
                  if(!bcrypt.compareSync(delete_password, thread.delete_password)){
                    res.send("incorrect password");
                  }else{
                    //delete thread from Thread
                    Thread.deleteOne({ _id: thread_id});
                    //delete thread from Board
                    board.thread.splice( board.thread.indexOf(thread_id), 1);
                    board.save();
                    res.send("success");
                  }//end if it's the right password
                }//end if thread is found in Thread
              });// end find thread_id in Thread logic
            }//end if thread_id is found in board
          }//end if board is found in Board
        }); //end find boardTitle in Board logic
      }else{
        res.send("Required field(s) are missing")
      }
    });

  app.route('/api/replies/:board')
    .get(function(req, res){
      if(req.query.thread_id){
        var thread_id = req.query.thread_id;
        //find thread
        Thread
          .findById({_id: thread_id})
          .select({"replies.reported": 0, "replies.delete_password": 0, delete_password:0, reported:0})
          .exec((err, thread)=>{
            if (err) return console.log(err);   
            if (!thread) res.send("There is no thread by that _id in database");
            //if thread is found
            else{
              res.send(thread);
            }//end if thread is found
          });//end find thread_id in Thread logic
      }//end if all inputs are provided
      else res.send("");
    })
    
    .post(function(req, res){
      //if all inputs are provided
      if(req.body.thread_id && req.body.text && req.body.delete_password && (req.body.board || req.params.board)){
        var boardTitle = req.body.board || req.params.board;
        const delete_password = req.body.delete_password;
        var thread_id = req.body.thread_id;
        var text = req.body.text;
        //find board
        Board.findOne({ title: boardTitle }, (err, board) => {
          if (err) return console.log(err);   
          if (!board) res.send("Board is not found");
          else{
            //if thread id is not found
            if(board.thread.indexOf(thread_id) == -1 ){
              res.send("There is no thread by that _id in board");
            }else{
              //find thread
              Thread.findById({_id: thread_id}, function (err, thread) {
                if (err) return console.log(err);   
                if (!thread) res.send("There is no thread by that _id in database");
                //if thread is found
                else{
                  //create reply in Replies
                  var replyID =  uuidv4();
                  const hash = bcrypt.hashSync(delete_password, 12);
                  var newReplyOBJ = {
                    _id: replyID,
                    text: text,
                    created_on: new Date(),
                    delete_password: hash,
                    reported: false
                  }
                  //update thread.replies
                  thread.replies.unshift(newReplyOBJ);
                  //update thread.replycount
                  thread.replycount = thread.replies.length;
                  //updated thread bumped_on
                  thread.bumped_on = new Date();
                  thread.save();
                  res.redirect(`/b/${boardTitle}/${thread_id}`);
                }//end if thread is found in Thread
              });// end find thread_id in Thread logic
            }//end if thread_id is found in board
          }//end if board is found in Board
        }); //end find boardTitle in Board logic
      }else{
        res.send("Required field(s) are missing")
      }
  })

  .delete(function(req, res){
    if( req.body.thread_id && req.body.reply_id && (req.body.board || req.params.board) && req.body.delete_password){
      var boardTitle = req.body.board || req.params.board;
      const delete_password = req.body.delete_password;
      var thread_id = req.body.thread_id;
      var reply_id = req.body.reply_id;
      //find thread by reply id
      Thread.findOne({_id: thread_id, "replies._id": reply_id}, (err, thread) => {
        if (err) return console.log(err);   
        if (!thread) res.send("Either thread_id or reply_id is wrong");
        //if thread id is found
        else{
          //check if password is correct
          if(!bcrypt.compareSync(delete_password, thread.replies.id(reply_id).delete_password)){
            res.send("incorrect password");
          }else{                      
            //change text of reply to [deleted]    
            thread.replies.id(reply_id).text = '[deleted]';
            thread.save();
            res.send("success");
          }//end if password is correct
        }//end if thread is found
      });//end find thread by reply id in Thread logic
    }//end if all inputs are provided
    else{
      res.send("Required field(s) are missing")    
    }
  })

};
