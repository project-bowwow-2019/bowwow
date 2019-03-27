import Layout from '../components/Layout.js'
import ChatAppTest from '../components/ChatAppTest.js'
import ChatWidgetTest from '../components/ChatWidgetTest.js'

export default () => (
    <Layout>
       <p>This is page to test the chatbot </p>
       <ChatAppTest />
       <div>
        <p> This is the widget to test the chatbot </p>
        <ChatWidgetTest/>
      </div>

    </Layout>
)
