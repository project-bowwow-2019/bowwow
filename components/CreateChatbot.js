import React from 'react';
import ReactDOM from 'react-dom';
import MainBusinessSelect from './MainBusinessSelect'
import CommonResponses from './CommonResponses'

class CreateChatbot extends React.Component{
  constructor(props){
    super(props)
    this.state={
      businessType:{},
      userID:'',
      commonQuestions:{},
      userResponses:{},
      customQuestions:{},
      commonQuestionsDone:false,
    }
    this.handleBusinessTypeSubmit=this.handleBusinessTypeSubmit.bind(this)
  }

  async componentDidMount(){
    this.setState({businessType:{}})
  }

  handleBusinessTypeSubmit(businessType, commonQuestions, userID){
    this.setState({businessType:businessType, commonQuestions:commonQuestions, userID:userID})
  }

  handleResponseSubmit(userResponses){
    this.setState({userResponses:userResponses, commonQuestionsDone:true})
  }


  render(){
    let component;

    if(Object.keys(this.state.businessType).length == 0){
      component = <MainBusinessSelect category={this.props.category} handleBusinessTypeSubmit={this.handleBusinessTypeSubmit} />
    } else if (Object.keys(this.state.commonQuestions).length != 0 && !this.state.commonQuestionsDone) {
      component = <CommonResponses commonQuestions={this.state.commonQuestions} handleParentHandler={this.handleResponseSubmit} businessType={this.state.businessType}/>
    } else {
      component = null;
    }

    return(
      <div>
        {component}
      </div>
    )
  }

}

export default CreateChatbot;
