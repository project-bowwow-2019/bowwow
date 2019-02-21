import React from 'react';
import ReactDOM from 'react-dom';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent:'center',
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width:500
  }
});

class CommonResponses extends React.Component{

  constructor(props){
    super(props)
    this.state ={
      userResponses:[],
      customQuestions:{},
      questionIndex:0,
      inputBuffer:'',
      questionLeft:this.props.commonQuestions.length-1,
      done:false
    }
    this.handleUserSubmit=this.handleUserSubmit.bind(this);
    this.handlePrevious=this.handlePrevious.bind(this);
  }

  async handleUserSubmit(event){
    event.preventDefault();
    var tempResponses = this.state.userResponses;
    var tempIndex = this.state.questionIndex+1;
    var qLeft=this.state.questionLeft-1;
    var responseToPush = {'intent':this.props.commonQuestions[this.state.questionIndex].intent, 'userResponse':this.state.inputBuffer}
    if(typeof tempResponses[this.state.questionIndex] === 'undefined'){
      tempResponses.push(responseToPush);
      this.setState({inputBuffer:''})
    } else if (typeof tempResponses[tempIndex] === 'undefined') {
      tempResponses[this.state.questionIndex].userResponse=this.state.inputBuffer;
      this.setState({inputBuffer:''})
    } else {
      var prevInput = this.state.userResponses[tempIndex].userResponse;
      tempResponses[this.state.questionIndex].userResponse=this.state.inputBuffer;
      this.setState({inputBuffer:prevInput})
    }
    await this.setState({userResponses:tempResponses})
    if (tempIndex >= this.props.commonQuestions.length){
      this.props.handleParentHandler(this.state.userResponses)
    } else {
      this.setState({questionIndex:tempIndex});
    }
    this.setState({questionLeft:qLeft});
  }

  async handlePrevious(event){
    event.preventDefault()
    var qLeft=this.state.questionLeft+1;
    var prevIndex = this.state.questionIndex-1;
    var prevInput = this.state.userResponses[prevIndex].userResponse;
    this.setState({inputBuffer:prevInput, questionIndex:prevIndex, questionLeft:qLeft})
  }

  handleOnChange = event =>{
    event.preventDefault()
    var userInput = event.target.value;
    this.setState({inputBuffer:userInput});
  }

  render(){
    var qIndex = this.state.questionIndex
    const { classes } = this.props;
    return(
      <div>
        <Typography variant='subtitle1' align='center'>
          Great! Let's make your chatbot.
        </Typography>
        <Typography variant='subtitle1' align='center'>
          For your {this.props.businessType.subtype} business, here are some common questions customers ask
        </Typography>
        <Typography variant='caption' align='center'>
          You may choose to skip answering but it will mean the chatbot will default to "Sorry I don't know how to answer that". {'\n'}
          You can change it later if you decide to get an account with us!
        </Typography>
        <Typography variant='subtitle1' align='center'>
          Customer Question: {this.props.commonQuestions[qIndex].common_questions}
        </Typography>
        <form className={classes.container} noValidate autoComplete='off' onSubmit={this.handleUserSubmit}>
          <TextField
            id="outlined-response-input"
            label="Your Response"
            className={classes.textField}
            name="userResponse"
            margin="normal"
            variant="outlined"
            value={this.state.inputBuffer}
            onChange={this.handleOnChange}
          />
          {(this.props.commonQuestions.length-this.state.questionLeft != 1) ? (
            <Button variant='contained' color='primary' onClick={this.handlePrevious}>
              Previous
            </Button>
          ) : (null)}
          {(this.state.questionLeft != 0)? (
            <Button variant='contained' color='primary' type='submit' >
              Next ({this.state.questionLeft} more)
            </Button>
          ) : (
            <Button variant='contained' color='primary' type='submit'>
              Submit!
            </Button>
          )}
        </form>
      </div>
    );
  }
}
export default withStyles(styles)(CommonResponses);
