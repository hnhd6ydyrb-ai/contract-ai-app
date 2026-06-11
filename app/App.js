import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const SERVER_URL = "http://172.20.10.2:3000";
const STORAGE_KEY = "contract_analysis_history";

export default function App() {
  const [contractText, setContractText] = useState("");
  const [result, setResult] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [history, setHistory] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  const drawerWidth = screenWidth * 0.75;
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;

  useEffect(() => {
    loadHistory();
  }, []);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -drawerWidth,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuOpen(false);
    });
  };

  const loadHistory = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) setHistory(JSON.parse(saved));
  };

  const saveHistory = async (type, content) => {
    const newItem = {
      id: Date.now().toString(),
      type,
      result: content,
      date: new Date().toLocaleString(),
    };

    const newHistory = [newItem, ...history].slice(0, 10);
    setHistory(newHistory);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    Alert.alert("기록을 삭제했습니다.");
  };

  const copyResult = async () => {
    if (!result) {
      Alert.alert("복사할 결과가 없습니다.");
      return;
    }

    await Clipboard.setStringAsync(result);
    Alert.alert("분석 결과를 복사했습니다.");
  };

  const exportPDF = async () => {
    if (!result) {
      Alert.alert("PDF로 저장할 결과가 없습니다.");
      return;
    }

    const html = `
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h1>AI 계약서 분석 결과</h1>
          <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${result}</pre>
          <p style="margin-top: 30px; font-size: 12px;">
            본 내용은 참고용이며 정확한 법률 판단은 전문가 상담이 필요합니다.
          </p>
        </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(file.uri);
  };

  const handleResult = async (type, content) => {
    setResult(content);

    if (
      content &&
      !content.includes("실패") &&
      !content.includes("오류") &&
      !content.includes("분석 중")
    ) {
      await saveHistory(type, content);
    }
  };

  const analyzeText = async () => {
    try {
      setResult("텍스트 계약서 분석 중...");

      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contractText }),
      });

      const data = await response.json();

      await handleResult(
        "텍스트",
        data.result || data.error || "분석 결과를 받지 못했습니다."
      );
    } catch (error) {
      console.log(error);
      setResult("서버 연결 실패");
    }
  };

  const analyzeImageBase64 = async (imageBase64, mimeType, uri) => {
    try {
      setImageUri(uri);
      setResult("이미지 계약서 분석 중...");

      const response = await fetch(`${SERVER_URL}/analyze-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: mimeType || "image/jpeg",
        }),
      });

      const data = await response.json();

      await handleResult(
        "이미지",
        data.result || data.error || "분석 결과를 받지 못했습니다."
      );
    } catch (error) {
      console.log(error);
      setResult("이미지 분석 실패");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setResult("사진 접근 권한이 필요합니다.");
      return;
    }

    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.3,
    });

    if (selected.canceled) return;

    const image = selected.assets[0];

    await analyzeImageBase64(
      image.base64,
      image.mimeType || "image/jpeg",
      image.uri
    );
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setResult("카메라 권한이 필요합니다.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.3,
    });

    if (photo.canceled) return;

    const image = photo.assets[0];

    await analyzeImageBase64(
      image.base64,
      image.mimeType || "image/jpeg",
      image.uri
    );
  };

  const pickPDF = async () => {
    try {
      setResult("PDF 선택 중...");

      const selected = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (selected.canceled) return;

      const file = selected.assets[0];

      setImageUri("");
      setResult("PDF 계약서 분석 중...");

      const pdfBase64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`${SERVER_URL}/analyze-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          mimeType: "application/pdf",
        }),
      });

      const data = await response.json();

      await handleResult(
        "PDF",
        data.result || data.error || "PDF 분석 결과를 받지 못했습니다."
      );
    } catch (error) {
      console.log(error);
      setResult("PDF 분석 실패");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={menuOpen} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.overlayTouch} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.menuBox,
              {
                width: drawerWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>메뉴</Text>

              <TouchableOpacity onPress={closeMenu}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>최근 분석 기록</Text>

            {history.length === 0 ? (
              <Text style={styles.emptyText}>저장된 분석 기록이 없습니다.</Text>
            ) : (
              <ScrollView>
                {history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => {
                      setResult(item.result);
                      closeMenu();
                    }}
                  >
                    <Text style={styles.historyType}>{item.type} 분석</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <Text numberOfLines={2} style={styles.historyPreview}>
                      {item.result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.deleteButton} onPress={clearHistory}>
              <Text style={styles.deleteButtonText}>최근 기록 전체 삭제</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.title}>AI 계약서 해석</Text>
        </View>

        <TextInput
          style={styles.input}
          multiline
          placeholder="계약서 내용을 입력하세요"
          value={contractText}
          onChangeText={setContractText}
        />

        <TouchableOpacity style={styles.mainButton} onPress={analyzeText}>
          <Text style={styles.mainButtonText}>AI 분석하기</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.subButton} onPress={pickImage}>
            <Text style={styles.subButtonText}>갤러리</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.subButton} onPress={takePhoto}>
            <Text style={styles.subButtonText}>카메라</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.subButton} onPress={pickPDF}>
            <Text style={styles.subButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : null}

        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>분석 결과</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.copyButton} onPress={copyResult}>
            <Text style={styles.copyButtonText}>결과 복사</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pdfButton} onPress={exportPDF}>
            <Text style={styles.copyButtonText}>PDF 저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 55,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  menuIcon: {
    fontSize: 26,
    fontWeight: "bold",
  },
  title: {
    fontSize: 23,
    fontWeight: "bold",
  },
  input: {
    height: 170,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
  },
  mainButton: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: "center",
  },
  mainButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  subButton: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  subButtonText: {
    color: "#111",
    fontWeight: "bold",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 15,
  },
  resultBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 12,
  },
  resultTitle: {
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 18,
  },
  resultText: {
    lineHeight: 22,
  },
  copyButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  pdfButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  copyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlayTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuBox: {
    height: "100%",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 26,
    fontWeight: "bold",
  },
  closeText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    color: "#777",
    marginTop: 10,
  },
  historyItem: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
  },
  historyType: {
    fontWeight: "bold",
  },
  historyDate: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },
  historyPreview: {
    marginTop: 6,
    color: "#333",
  },
  deleteButton: {
    marginTop: 15,
    backgroundColor: "#ffdddd",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "red",
    fontWeight: "bold",
  },
  
  scrollContent: {
  paddingHorizontal: 24,
  paddingBottom: 30,
  },
  
});
