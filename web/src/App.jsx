import { useState } from "react";
import "./App.css";

const SERVER_URL = "https://contract-ai-app-production.up.railway.app";
const WEB_URL = "https://web-five-brown-85.vercel.app";
const APK_URL =
  "https://github.com/hnhd6ydyrb-ai/contract-ai-app/releases/download/v1.0.0/application-a9939093-820e-4a43-9e83-96a718357774.apk";

function App() {
  const [contractText, setContractText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeContract = async () => {
    if (!contractText.trim()) {
      alert("계약서 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: contractText,
        }),
      });

      const data = await response.json();
      setResult(data.result || data.error || "분석 결과를 받지 못했습니다.");
    } catch (error) {
      console.log(error);
      setResult("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) {
      alert("복사할 결과가 없습니다.");
      return;
    }

    await navigator.clipboard.writeText(result);
    alert("분석 결과가 복사되었습니다.");
  };

  const clearAll = () => {
    setContractText("");
    setResult("");
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="badge">AI Contract Checker</div>
        <h1>AI 계약서 해석</h1>
        <p>
          어려운 계약서를 붙여넣으면 AI가 핵심 내용, 위험 조항, 주의할 점을
          쉽게 정리해줍니다.
        </p>
      </header>

      <nav className="menu">
        <a href="#analyze">AI 분석</a>
        <a href="#iphone">iPhone 사용</a>
        <a href="#android">Android APK</a>
        <a href="#mac">Mac 앱</a>
        <a href="#about">서비스 안내</a>
      </nav>

      <section id="analyze">
        <main className="layout">
          <section className="card input-card">
            <div className="section-title">
              <h2>계약서 입력</h2>
              <span>{contractText.length}자</span>
            </div>

            <textarea
              placeholder="계약서 내용을 여기에 붙여넣으세요..."
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
            />

            <div className="button-row">
              <button className="primary-btn" onClick={analyzeContract}>
                {loading ? "분석 중..." : "AI 분석하기"}
              </button>

              <button className="secondary-btn" onClick={clearAll}>
                초기화
              </button>
            </div>

            <p className="notice">
              본 서비스는 참고용 분석 도구이며, 정확한 법률 판단은 전문가 상담이
              필요합니다.
            </p>
          </section>

          <section className="card result-card">
            <div className="section-title">
              <h2>분석 결과</h2>
              <button className="copy-btn" onClick={copyResult}>
                결과 복사
              </button>
            </div>

            {!result && !loading && (
              <div className="empty">
                계약서를 입력하고 분석 버튼을 누르면 결과가 여기에 표시됩니다.
              </div>
            )}

            {loading && (
              <div className="loading-box">
                <div className="spinner" />
                <p>AI가 계약서를 분석하고 있습니다...</p>
              </div>
            )}

            {result && <pre className="result-text">{result}</pre>}
          </section>
        </main>
      </section>

      <section className="features">
        <div>
          <strong>위험도 점수</strong>
          <p>계약서의 위험 수준을 0~100점으로 평가합니다.</p>
        </div>
        <div>
          <strong>위험 조항 탐지</strong>
          <p>위약금, 자동연장, 손해배상 조항을 찾아냅니다.</p>
        </div>
        <div>
          <strong>쉬운 설명</strong>
          <p>어려운 법률 표현을 일반인이 이해하기 쉽게 풀이합니다.</p>
        </div>
      </section>

      <section id="iphone" className="info-section">
        <h2>📱 iPhone 사용 방법</h2>

        <div className="info-card iphone-card">
          <h3>앱 설치 없이 iPhone에서 사용하기</h3>

          <p>
            iPhone에서는 별도 앱 설치 없이 Safari에서 바로 사용할 수 있습니다.
            홈 화면에 추가하면 일반 앱처럼 아이콘으로 실행할 수 있습니다.
          </p>

          <div className="steps">
            <div className="step">
              <span>1</span>
              <p>Safari에서 이 웹사이트에 접속합니다.</p>
            </div>

            <div className="step">
              <span>2</span>
              <p>하단의 공유 버튼을 누릅니다.</p>
            </div>

            <div className="step">
              <span>3</span>
              <p>“홈 화면에 추가”를 선택합니다.</p>
            </div>

            <div className="step">
              <span>4</span>
              <p>홈 화면에 생긴 아이콘으로 앱처럼 실행합니다.</p>
            </div>
          </div>

          <a
            className="download-link"
            href={WEB_URL}
            target="_blank"
            rel="noreferrer"
          >
            iPhone에서 웹 앱 열기
          </a>
        </div>
      </section>

      <section id="android" className="info-section">
        <h2>🤖 Android APK</h2>

        <div className="info-card android-card">
          <h3>Android 설치 파일 다운로드</h3>
          <p>
            Android 사용자는 APK 파일을 다운로드해서 설치할 수 있습니다.
            설치 시 “알 수 없는 앱 설치 허용” 안내가 나올 수 있습니다.
          </p>

          <a
            href={APK_URL}
            target="_blank"
            rel="noreferrer"
            className="download-link"
          >
            🤖 Android APK 다운로드
          </a>
        </div>
      </section>

      <section id="mac" className="info-section">
        <h2>💻 Mac 앱</h2>

        <div className="info-card">
          <h3>Mac 데스크톱 앱</h3>
          <p>
            Mac에서 설치해서 사용할 수 있는 데스크톱 버전을 준비 중입니다.
            현재는 웹사이트에서 바로 사용할 수 있습니다.
          </p>

          <button className="download-btn">Mac 다운로드 준비 중</button>
        </div>
      </section>

      <section id="about" className="info-section">
        <h2>ℹ️ 서비스 안내</h2>

        <div className="info-card">
          <p>
            AI 계약서 해석은 계약서 내용을 쉽게 이해할 수 있도록 도와주는
            참고용 분석 서비스입니다.
          </p>

          <p>
            분석 결과는 법률 자문을 대체하지 않으며, 중요한 계약은 반드시 전문가
            상담을 권장합니다.
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;
