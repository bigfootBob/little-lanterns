import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';

export default function ReviewScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.btnText}>Review</Text>
        </SafeAreaView>
    );
}
