export default function Footer() {
  return (
    <footer className="w-full bg-[#111] border-t border-white/5 text-gray-400 flex items-center justify-center font-sans">
      <div className="w-full max-w-[1400px] mx-auto px-6 py-6 md:py-8" style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
        {/* TOP GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* LOGO & DESCRIPTION */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 opacity-90">
                <img
                  src={`${import.meta.env.BASE_URL}image/logo.png`}
                  alt="AI Partner 로고"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold text-white tracking-wide">FLOW</span>
            </div>

            <p className="text-xs leading-6 opacity-80">
              가족의 건강을 위한<br />
              프리미엄 AI 산책 파트너
            </p>
          </div>

          {/* SERVICE */}
          <div>
            <h4 className="text-white font-bold mb-3 text-xs tracking-wider uppercase opacity-90">Service</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  서비스 소개
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  요금제 및 멤버십
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  구축 사례
                </a>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h4 className="text-white font-bold mb-3 text-xs tracking-wider uppercase opacity-90">Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  이용 가이드
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  1:1 문의하기
                </a>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="text-white font-bold mb-3 text-xs tracking-wider uppercase opacity-90">Contact</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-white">📞</span>
                <span className="hover:text-white transition-colors cursor-pointer">1588-0000</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white">📧</span>
                <span className="hover:text-white transition-colors cursor-pointer">support@flow.com</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white opacity-50">🕒</span>
                <span>평일 09:00 - 18:00<br /><span className="text-[10px] opacity-60">(주말 및 공휴일 휴무)</span></span>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
          <p>© 2025 FLOW. All rights reserved.</p>

          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">이용약관</a>
            <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-white transition-colors">사업자정보</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
