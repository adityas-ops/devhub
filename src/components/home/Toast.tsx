import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6/static';

export const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-20)).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleClose();
    }, 2000);

    return () => clearTimeout(timer);
  }, []); // Run only on mount

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        { opacity, transform: [{ translateY }] },
        { backgroundColor: type === 'success' ? '#10b981' : '#ef4444' },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <FontAwesome6
          name="xmark"
          size={14}
          color="#ffffff"
          iconStyle="solid"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 20,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  closeButton: {
    padding: 2,
  },
});
