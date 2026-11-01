"""
[INPUT]: 包内 CLI、临时 Unicode 文件、标准库 MIME 解析器。
[OUTPUT]: 上传文件名兼容性与内容完整性回归检查，不调用生产 API。
[POS]: 工具包 multipart 上传契约验证。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
from email import policy
from email.parser import BytesParser
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "assets"))
import limix


class UploadTests(unittest.TestCase):
    def test_transport_names_preserve_data_and_extension(self):
        for name in ('历史实验.csv', '预测数据.XLSX', 'a"b.csv', 'line\nbreak.csv', 'train.csv'):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / name
                data = '成分,强度\n0.1,1200\n'.encode('utf-8')
                path.write_bytes(data)
                body, ctype = limix.encode_multipart(str(path), {'encoding': 'utf-8'})
                message = BytesParser(policy=policy.default).parsebytes(
                    f'Content-Type: {ctype}\r\nMIME-Version: 1.0\r\n\r\n'.encode() + body)
                parts = list(message.iter_parts())
                self.assertEqual(len(parts), 2)
                self.assertEqual(parts[0].get_payload(decode=True), b'utf-8')
                upload = parts[1]
                self.assertRegex(upload.get_filename(), r'^[A-Za-z0-9_. -]+$')
                self.assertTrue(upload.get_filename().endswith(path.suffix))
                self.assertEqual(upload.get_payload(decode=True), data)
                self.assertEqual(path.read_bytes(), data)
                self.assertEqual(list(Path(folder).iterdir()), [path])
                if name == 'train.csv':
                    self.assertEqual(upload.get_filename(), name)


if __name__ == '__main__':
    unittest.main()
