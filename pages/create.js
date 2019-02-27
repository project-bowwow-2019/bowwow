import Layout from '../components/Layout.js'
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import CreateChatbot from '../components/CreateChatbot';

const Create = (props) => (
    <Layout>
      
      <CreateChatbot category={props.category}/>

    </Layout>
)

Create.getInitialProps = async function(){
  const response = await fetch('http://localhost:5000/chatbotCreate/api/getCategory')
  const body = await response.json()
  if (response.status !== 200) throw Error(body.message);
  return {category:body};
}

export default Create
