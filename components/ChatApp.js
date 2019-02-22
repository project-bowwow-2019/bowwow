import '../styles/ChatApp.css';
import React from 'react';
import Messages from './Messages';
import ChatInput from './ChatInput';

class ChatApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { messages: [] };
    this.sendHandler = this.sendHandler.bind(this);
  }

  sendHandler(message) {
    const messageObject = {
      userId: this.props.userId,
      message
    };

    // Emit the message to the server
    // fetch response from the server here

    messageObject.fromMe = true;
    this.addMessage(messageObject);
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
ChatApp.defaultProps = {
  username: 'Anonymous'
};

export default ChatApp;
