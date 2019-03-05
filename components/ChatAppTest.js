import '../styles/ChatApp.css';
import React from 'react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import uuidv4 from 'uuid/v4';

class ChatAppTest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      sessionID:'',
      userID:'',
      currentContext:[],
      handledContext:[],
      handledContextNew:[],
      userInfo:{
        prevTest:{
          relativeLocation:'',
          date:'',
          dateRange:'',
          passFail:'',
        }
      }
    };
    this.sendHandler = this.sendHandler.bind(this);
    this.getChatbotResponse = this.getChatbotResponse.bind(this);
  }

  async componentDidMount () {
    if (this.state.sessionID === ""){
      var id = await uuidv4();
      await this.setState({sessionID:id})
      localStorage.setItem("sessionID", id)
    }
    this.setState({userID:'5b4429b3-e4ee-4876-8a4f-5267b7531d39'})
  }

  async sendHandler(message) {
    const messageObject = {
      userId: this.state.userID,
      message:message
    };

    // Emit the message to the server
    // fetch response from the server here

    messageObject.fromMe = true;
    await this.addMessage(messageObject);

    this.getChatbotResponse(messageObject);
  }

  getChatbotResponse(message){
    const postObject = {
      userID:this.state.userID,
      sessionID:this.state.sessionID,
      userUtterance:message.message,
      currentContext:this.state.currentContext,
      handledContextNew:this.state.handledContextNew,
      hanldedContext:this.state.handledContext,
      userInfo:this.state.userInfo,
    }
    fetch('/chatbotTest/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postObject)
    })
    .then(res => res.json())
    .then(data => {
      const messageObject ={
        userId: this.state.userId,
        message:data.fulfillmentText,
        fromMe:false,
      }
      this.addMessage(messageObject)
      if(data.contexts!=null){
        this.setState({currentContext:data.contexts});
      }
      if(data.handledContextNew !=null){
        this.setState({handledContextNew:data.handledContextNew});
      }
      if(data.handledContextNew != null){
        this.state.handledContext.push(data.handledContextNew)
      }
      if(data.prevTest != undefined){
        const newUserInfo = this.state.userInfo;
        newUserInfo.prevTest = data.prevTest;
        this.setState({userInfo:newUserInfo})
      }
    })
    .catch(err => {
      console.log(err.status);
    })
  }

  addMessage(message) {
    // Append the message to the component state
    const messages = this.state.messages;
    messages.push(message);
    this.setState({ messages });
  }

  render() {
    return (
      <div className="container">
        <h3>Test your chatbot!</h3>
        <Messages messages={this.state.messages} />
        <ChatInput onSend={this.sendHandler} />
      </div>
    );
  }

}
ChatAppTest.defaultProps = {
  username: 'Anonymous'
};

export default ChatAppTest;
