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
    justifyContent:'center'
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
      done:false
    }
    this.handleUserSubmit=this.handleUserSubmit.bind(this);
  }

  async handleUserSubmit(){
    var tempResponses = this.state.userResponses;
    var tempIndex = this.state.questionIndex+1;
    var responseToPush = {'intent':this.props.commonQuestions[this.state.questionIndex].intent, 'userReponse':this.state.inputBuffer}
    tempResponses.push(responseToPush);
    await this.setState({userResponses:tempResponses})
    if (tempIndex > this.props.commonQuestions.length){
      this.props.handleParentHandler(this.state.userResponses)
    } else {
      this.setState({questionIndex:tempIndex});
    }
    this.setState({inputBuffer:''})
  }

  handleOnChange = event =>{
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
        <Button variant='contained' color='primary' onClick={this.handleUserSubmit}>
          Submit!
        </Button>
      </div>
    );
  }
}
export default withStyles(styles)(CommonResponses);
