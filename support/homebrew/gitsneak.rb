class Gitsneak < Formula
  desc "Analyze organizational involvement in GitHub repositories"
  homepage "https://github.com/motleydev/gitsneak"
  url "https://registry.npmjs.org/gitsneak/-/gitsneak-1.0.0.tgz"
  sha256 "eea0738f57a90cf2b28e851e905e091779a7351b618d17d93c6dd3d4becfd5a4"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
    man1.install Dir["#{libexec}/lib/node_modules/gitsneak/man/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/gitsneak --version")
  end
end
