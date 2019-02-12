import Layout from '../components/Layout.js'
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import MainBusinessSelect from '../components/MainBusinessSelect';

const Create = (props) => (
    <Layout>
      <Typography variant='h4' gutterbottom='true' align='center'>
        Create your own chatbot
      </Typography>
      <Typography variant='subtitle1' align='center'>
        What type of business do you have?
      </Typography>
      <Typography variant='caption' align='center'>
        Knowing this will help us specialize the chatbot for what you need
      </Typography>
      <MainBusinessSelect category={props.category}/>

    </Layout>
)

Create.getInitialProps = async function(){
  const response = await fetch('http://localhost:5000/chatbotCreate/api/getCategory')
  const body = await response.json()
  if (response.status !== 200) throw Error(body.message);
  return {category:body};
}

export default Create
