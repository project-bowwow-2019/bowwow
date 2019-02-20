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

//parent need to pass prop "businessType" with field "subtype"
class CustomQuestions extends React.Component{
  constructor(props){
    super(props)
    this.state = {
      questionLeft:4,
      questionIndex:0,
      customQuestions:[],
      questionInputBuffer:'',
      responseInputBuffer:'',
    }
  }

  handleQuestionOnChange = event =>{
    var userInput = event.target.value;
    this.setState({questionInputBuffer:userInput});
  }

  handleResponseOnChange = event =>{
    var userInput = event.target.value;
    this.setState({responseInputBuffer:userInput});
  }

  handleUserSubmit = async event => {
    var tempQuestions = this.state.customQuestions;
    var tempIndex = this.state.questionIndex+1;
    var qLeft=this.state.questionLeft-1;
    var questionToPush = {'question':this.state.questionInputBuffer, 'response':this.state.responseInputBuffer}
    if(typeof tempQuestions[this.state.questionIndex] === 'undefined'){
      tempQuestions.push(questionToPush);
      this.setState({questionInputBuffer:'', responseInputBuffer:''})
    } else if (typeof tempQuestions[tempIndex] === 'undefined') {
      tempQuestions[this.state.questionIndex].question=this.state.questionInputBuffer;
      tempQuestions[this.state.questionIndex].response=this.state.responseInputBuffer;
      this.setState({questionInputBuffer:'', responseInputBuffer:''})
    } else {
      var prevQuestion = this.state.customQuestions[tempIndex].question;
      var prevResponse = this.state.customQuestions[tempIndex].response;
      tempQuestions[this.state.questionIndex].question=this.state.questionInputBuffer;
      tempQuestions[this.state.questionIndex].response=this.state.responseInputBuffer;
      this.setState({questionInputBuffer:prevQuestion, responseInputBuffer:prevResponse})
    }
    await this.setState({customQuestions:tempQuestions})
    if (qLeft<0){
      this.props.handleParentHandler(this.state.customQuestions)
    } else {
      this.setState({questionIndex:tempIndex});
    }
    this.setState({questionLeft:qLeft});
  }

  handlePrevious=async event => {
    var qLeft=this.state.questionLeft+1;
    var prevIndex = this.state.questionIndex-1;
    var prevQuestion = this.state.customQuestions[prevIndex].question;
    var prevResponse = this.state.customQuestions[prevIndex].response;
    this.setState({questionInputBuffer:prevQuestion, responseInputBuffer:prevResponse, questionIndex:prevIndex, questionLeft:qLeft})
  }

  render(){
    const { classes } = this.props;
    return(
      <div>
        <Typography variant='subtitle1' align='center'>
          Here you can add some questions you expect from your customers specific for your {this.props.businessType.subtype} business
        </Typography>
        <Typography variant='caption' align='center'>
          You can enter up to 5 for free
        </Typography>
        <form className={classes.container} noValidate autoComplete='off'>
          <Typography variant='subtitle2' alight='center'>
            Your customer's question:
          </Typography>
          <TextField
            id="outlined-response-input"
            label="Customer Question"
            className={classes.textField}
            name="customerQuestion"
            margin="normal"
            variant="outlined"
            value={this.state.questionInputBuffer}
            onChange={this.handleQuestionOnChange}
          />
        </form>
        <form className={classes.container} noValidate autoComplete='off'>
          <Typography variant='subtitle2' alight='center'>
            Your response:
          </Typography>
          <TextField
            id="outlined-response-input"
            label="Your Response"
            className={classes.textField}
            name="userResponse"
            margin="normal"
            variant="outlined"
            value={this.state.responseInputBuffer}
            onChange={this.handleResponseOnChange}
          />
        </form>
        {(this.state.questionIndex!=0) ? (
          <Button variant='contained' color='primary' onClick={this.handlePrevious}>
            Previous
          </Button>
        ) : (null)}
        {(this.state.questionLeft != 0)? (
          <Button variant='contained' color='primary' onClick={this.handleUserSubmit} >
            Next ({this.state.questionLeft} more)
          </Button>
        ) : (
          <Button variant='contained' color='primary' onClick={this.handleUserSubmit} >
            Submit!
          </Button>
        )}
      </div>
    )
  }
}

export default withStyles(styles)(CustomQuestions);
