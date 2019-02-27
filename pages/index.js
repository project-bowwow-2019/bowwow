import Layout from '../components/Layout.js'
import Button from '@material-ui/core/Button';

const Index = (props) => (
    <Layout>
      <p>Hello Next.js</p>
        <Button variant = 'contained' color = 'primary'>
          Click Me!
        </Button>
    </Layout>
)

export default Index;
