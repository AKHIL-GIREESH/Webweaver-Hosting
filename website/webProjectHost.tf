provider "aws" {
  region = "ap-south-1"
}

variable "subdomain_name" {
  description = "The subdomain for the website"
  type        = string
}

resource "aws_instance" "web" {
  ami                    = "ami-0721e960d6efc1eb1"
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.rsaa.id
  vpc_security_group_ids = [aws_security_group.ssh-access.id]

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

data "aws_route53_zone" "webweaver" {
  name         = "webweaver.live"
  private_zone = false
}

resource "aws_route53_record" "webweaver_subdomain" {
  zone_id = data.aws_route53_zone.webweaver.zone_id
  name    = "${var.subdomain_name}.webweaver.live"
  type    = "A"
  ttl     = 300
  records = [aws_instance.web.public_ip]
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}

output "full_subdomain_url" {
  value = aws_route53_record.webweaver_subdomain.name
}
