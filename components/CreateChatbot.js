import React from 'react';
import ReactDOM from 'react-dom';
import MainBusinessSelect from './MainBusinessSelect'
import CommonResponses from './CommonResponses'
import CustomQuestions from './CustomQuestions'

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
      customQuestionsDone:false,
    }
    this.handleBusinessTypeSubmit=this.handleBusinessTypeSubmit.bind(this);
    this.handleResponseSubmit=this.handleResponseSubmit.bind(this);
    this.handleCustomQuestionSubmit=this.handleCustomQuestionSubmit.bind(this);
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

  async handleCustomQuestionSubmit(customQuestions){
    await this.setState({customQuestions:customQuestions, customQuestionsDone:true})
    const response = await fetch('/chatbotCreate/api/postUserChats', {
      method: 'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify(this.state)
    })
    const body = await response.json()
    if (response.status !== 200) throw Error(body.message)
    console.log(body)
  }


  render(){
    let component;

    if(Object.keys(this.state.businessType).length == 0){
      component = <MainBusinessSelect category={this.props.category} handleBusinessTypeSubmit={this.handleBusinessTypeSubmit} />
    } else if (Object.keys(this.state.commonQuestions).length != 0 && !this.state.commonQuestionsDone) {
      component = <CommonResponses commonQuestions={this.state.commonQuestions} handleParentHandler={this.handleResponseSubmit} businessType={this.state.businessType}/>
    } else if (!this.state.customQuestionsDone) {
      component = <CustomQuestions handleParentHandler={this.handleCustomQuestionSubmit} businessType={this.state.businessType}/>;
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
