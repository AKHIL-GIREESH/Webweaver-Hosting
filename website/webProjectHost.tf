provider "aws" {
  region = "ap-south-1"
}

resource "aws_instance" "web" {
  ami                    = "ami-09dbe58aca105f5f1"
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.rsaa.id
  vpc_security_group_ids = ["sg-09ace2a9f6e37a0da"]

  tags = {
    Name = "Website-Instance"
  }

  provisioner "local-exec" {
    command = "echo ${self.public_ip} > instance_ip.txt"
  }
}


resource "aws_key_pair" "rsaa" {
  public_key = file("/Users/akhilgireesh/.ssh/id_rsa.pub")
}

resource "aws_security_group" "ssh-access" {
  name        = "ssh-access-1"
  description = "To allow ssh access from the internet"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5173
    to_port     = 5173
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}
