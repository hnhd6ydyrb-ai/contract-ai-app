import * as Linking from "expo-linking";
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

const SERVER_URL = "https://contract-ai-app-production.up.railway.app";
const APK_URL =
  "https://github.com/hnhd6ydyrb-ai/contract-ai-app/releases/download/v1.0.0/application-a9939093-820e-4a43-9e83-96a718357774.apk";

const WEB_URL =
  "https://web-five-brown-85.vercel.app";

const APK_QR =
  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(APK_URL)}`;

const WEB_QR =
  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(WEB_URL)}`;
const WEB_URL = "https://web-five-brown-85.vercel.app";
const STORAGE_KEY = "contract_analysis_history";

export default function App() {
  const [contractText, setContractText] = useState("");
  const [result, setResult] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [history, setHistory] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState("");

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
    }).start(() => setMenuOpen(false));
  };

  const openInfo = (type) => {
    closeMenu();
    setTimeout(() => {
      setInfoModal(type);
    }, 260);
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
    Alert.alert("기록 삭제", "최근 분석 기록을 삭제했습니다.");
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
      if (!contractText.trim()) {
        Alert.alert("입력 필요", "계약서 내용을 입력해주세요.");
        return;
      }

      setResult("AI가 계약서를 분석하고 있습니다...");

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
      setResult("서버 연결에 실패했습니다.");
    }
  };

  const analyzeImageBase64 = async (imageBase64, mimeType, uri) => {
    try {
      setImageUri(uri);
      setResult("이미지 계약서를 분석하고 있습니다...");

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
        data.result || data.error || "이미지 분석 결과를 받지 못했습니다."
      );
    } catch (error) {
      console.log(error);
      setResult("이미지 분석에 실패했습니다.");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
      return;
    }

    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.35,
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
      Alert.alert("권한 필요", "카메라 권한이 필요합니다.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.35,
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
      const selected = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (selected.canceled) return;

      const file = selected.assets[0];

      setImageUri("");
      setResult("PDF 계약서를 분석하고 있습니다...");

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
      setResult("PDF 분석에 실패했습니다.");
    }
  };

  const copyResult = async () => {
    if (!result) {
      Alert.alert("복사 불가", "복사할 분석 결과가 없습니다.");
      return;
    }

    await Clipboard.setStringAsync(result);
    Alert.alert("복사 완료", "분석 결과를 복사했습니다.");
  };

  const exportPDF = async () => {
    if (!result) {
      Alert.alert("저장 불가", "PDF로 저장할 결과가 없습니다.");
      return;
    }

    const html = `
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h1>AI 계약서 분석 결과</h1>
          <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.7;">${result}</pre>
          <p style="margin-top: 30px; font-size: 12px;">
            본 내용은 참고용이며 정확한 법률 판단은 전문가 상담이 필요합니다.
          </p>
        </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(file.uri);
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

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
                <Text style={styles.menuItemText}>📄 AI 분석</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => openInfo("iphone")}
              >
                <Text style={styles.menuItemText}>📱 iPhone 사용법</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => openInfo("android")}
              >
                <Text style={styles.menuItemText}>🤖 Android APK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => openInfo("mac")}
              >
                <Text style={styles.menuItemText}>💻 Mac 앱</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => openInfo("about")}
              >
                <Text style={styles.menuItemText}>ℹ️ 서비스 안내</Text>
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
                    <Text numberOfLines={3} style={styles.historyPreview}>
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

      <Modal visible={infoModal !== ""} transparent animationType="fade">
        <View style={styles.infoOverlay}>
          <View style={styles.infoBox}>
            {infoModal === "iphone" && (
  <>
    <Text style={styles.infoTitle}>
      📱 iPhone 사용 방법
    </Text>

    <Image
      source={{ uri: WEB_QR }}
      style={styles.qrImage}
    />

    <Text style={styles.infoText}>
      QR 코드를 스캔하면
      AI 계약서 해석 웹사이트로 이동합니다.
    </Text>

    <TouchableOpacity
      style={styles.downloadButton}
      onPress={() => Linking.openURL(WEB_URL)}
    >
      <Text style={styles.downloadButtonText}>
        웹사이트 열기
      </Text>
    </TouchableOpacity>
  </>
)}

            {infoModal === "android" && (
  <>
    <Text style={styles.infoTitle}>
      🤖 Android APK 다운로드
    </Text>

    <Image
      source={{ uri: APK_QR }}
      style={styles.qrImage}
    />

    <Text style={styles.infoText}>
      QR 코드를 스캔하거나 아래 버튼을 눌러
      APK 파일을 다운로드하세요.
    </Text>

    <TouchableOpacity
      style={styles.downloadButton}
      onPress={() => Linking.openURL(APK_URL)}
    >
      <Text style={styles.downloadButtonText}>
        APK 다운로드
      </Text>
    </TouchableOpacity>
  </>
)}

            {infoModal === "mac" && (
              <>
                <Text style={styles.infoTitle}>💻 Mac 앱</Text>
                <Text style={styles.infoText}>
                  Mac 데스크톱 앱은 준비 중입니다.
                  {"\n\n"}현재는 웹사이트를 통해 Mac에서도 바로 사용할 수 있습니다.
                </Text>
              </>
            )}

            {infoModal === "about" && (
              <>
                <Text style={styles.infoTitle}>ℹ️ 서비스 안내</Text>
                <Text style={styles.infoText}>
                  AI 계약서 해석은 계약서 내용을 쉽게 이해할 수 있도록 도와주는
                  참고용 분석 서비스입니다.
                  {"\n\n"}분석 결과는 법률 자문을 대체하지 않으며, 중요한 계약은
                  전문가 상담을 권장합니다.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.closeInfoButton}
              onPress={() => setInfoModal("")}
            >
              <Text style={styles.closeInfoButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.topTitle}>AI 계약서 해석</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.badge}>AI Contract Checker</Text>
          <Text style={styles.title}>AI 계약서 해석</Text>
          <Text style={styles.subtitle}>
            어려운 계약서를 AI가 핵심 내용, 위험 조항, 주의할 점으로 쉽게
            정리해줍니다.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>계약서 입력</Text>
            <Text style={styles.countText}>{contractText.length}자</Text>
          </View>

          <TextInput
            style={styles.input}
            multiline
            placeholder="계약서 내용을 여기에 붙여넣으세요..."
            placeholderTextColor="#9ca3af"
            value={contractText}
            onChangeText={setContractText}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={analyzeText}>
              <Text style={styles.primaryButtonText}>AI 분석하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setContractText("");
                setResult("");
                setImageUri("");
              }}
            >
              <Text style={styles.secondaryButtonText}>초기화</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.notice}>
            본 서비스는 참고용 분석 도구이며, 정확한 법률 판단은 전문가 상담이
            필요합니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitleText}>파일 분석</Text>

          <View style={styles.fileRow}>
            <TouchableOpacity style={styles.fileButton} onPress={pickImage}>
              <Text style={styles.fileButtonText}>갤러리</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fileButton} onPress={takePhoto}>
              <Text style={styles.fileButtonText}>카메라</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fileButton} onPress={pickPDF}>
              <Text style={styles.fileButtonText}>PDF</Text>
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>분석 결과</Text>

            <TouchableOpacity style={styles.copySmallButton} onPress={copyResult}>
              <Text style={styles.copySmallButtonText}>결과 복사</Text>
            </TouchableOpacity>
          </View>

          {result ? (
            <Text style={styles.resultText}>{result}</Text>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                계약서를 입력하고 분석 버튼을 누르면 결과가 표시됩니다.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.pdfButton} onPress={exportPDF}>
            <Text style={styles.pdfButtonText}>분석 결과 PDF 저장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>위험도 점수</Text>
            <Text style={styles.featureText}>
              계약서의 위험 수준을 0~100점으로 평가합니다.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>위험 조항 탐지</Text>
            <Text style={styles.featureText}>
              위약금, 자동연장, 손해배상 조항을 찾아냅니다.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>쉬운 설명</Text>
            <Text style={styles.featureText}>
              어려운 법률 표현을 쉽게 풀이합니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = "#2563eb";
const BLUE_DARK = "#1d4ed8";
const BG = "#eef2ff";
const TEXT = "#111827";
const SUB = "#374151";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuIcon: {
    fontSize: 24,
    color: TEXT,
    fontWeight: "800",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  hero: {
    alignItems: "center",
    marginBottom: 22,
  },
  badge: {
    backgroundColor: "#dbeafe",
    color: BLUE,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: SUB,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
  },
  countText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  input: {
    minHeight: 240,
    borderWidth: 2,
    borderColor: "#dbeafe",
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    color: TEXT,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
    lineHeight: 23,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: TEXT,
    fontWeight: "900",
  },
  notice: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  fileRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  fileButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  fileButtonText: {
    color: TEXT,
    fontWeight: "900",
  },
  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginTop: 16,
  },
  copySmallButton: {
    backgroundColor: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  copySmallButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  resultText: {
    backgroundColor: "#f9fafb",
    color: TEXT,
    fontSize: 15,
    lineHeight: 25,
    padding: 16,
    borderRadius: 18,
  },
  emptyBox: {
    minHeight: 180,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyBoxText: {
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
  pdfButton: {
    marginTop: 14,
    backgroundColor: BLUE_DARK,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  pdfButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  features: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 6,
  },
  featureText: {
    color: SUB,
    lineHeight: 21,
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
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 60,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: TEXT,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "800",
    color: BLUE,
  },
  menuSection: {
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 12,
  },
  emptyText: {
    color: "#6b7280",
  },
  historyItem: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  historyType: {
    fontWeight: "900",
    color: TEXT,
  },
  historyDate: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  historyPreview: {
    marginTop: 8,
    color: SUB,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#ef4444",
    fontWeight: "900",
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 26,
    color: SUB,
  },
  closeInfoButton: {
    marginTop: 22,
    backgroundColor: BLUE,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeInfoButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  qrImage: {
  width: 220,
  height: 220,
  alignSelf: "center",
  marginBottom: 20,
},

downloadButton: {
  backgroundColor: "#2563eb",
  padding: 15,
  borderRadius: 14,
  alignItems: "center",
  marginTop: 20,
},

downloadButtonText: {
  color: "#ffffff",
  fontWeight: "900",
  fontSize: 16,
},
});
