# Homebrew formula for gitsneak
# Source: https://docs.brew.sh/Node-for-Formula-Authors
require "language/node"

class Gitsneak < Formula
  desc "Analyze organizational involvement in GitHub repositories"
  homepage "https://github.com/jesseops/gitsneak"
  url "https://registry.npmjs.org/gitsneak/-/gitsneak-VERSION.tgz"
  sha256 "SHA256_PLACEHOLDER"
  license "ISC"

  depends_on "node"
  # better-sqlite3 uses node-gyp which needs Python
  depends_on "python" => :build

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")

    # Install man page
    man1.install "man/gitsneak.1" if File.exist?("man/gitsneak.1")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/gitsneak --version")
  end
end
