import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from '@/widget/taskHandler';

// Headless entry for the home-screen widget; it runs even when the app isn't open.
registerWidgetTaskHandler(widgetTaskHandler);
